#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the model picker's vendor lockups from pinned Lobe Icons assets.

Run manually with `python scripts/fetch-lobe-combines.py` (requires fonttools);
the Node build stays offline. The viewBox uses the wordmark's capital band so
CSS can size every lockup with `height: 1cap` and let the mark overflow.
"""
import json
import os
import re
import sys
import urllib.request

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.svgLib.path import parse_path

STATIC = 'https://unpkg.com/@lobehub/icons-static-svg@1.95.0/icons'
REACT = 'https://unpkg.com/@lobehub/icons@1.95.0'
VERSION = '1.95.0'

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COPY = os.path.join(ROOT, 'packages', 'client', 'data', 'model-descriptions.json')
OUT_DIR = os.path.join(ROOT, 'packages', 'assets', 'src', 'icons', 'combine')
# Local <brand>.svg artwork takes precedence over fetched assets.
COMBINE_SRC = os.path.join(ROOT, 'packages', 'assets', 'src', 'icons')

LIGHT_CANVAS = '#ffffff'
DARK_CANVAS = '#191919'
# Below this contrast, use currentColor instead of a brand tint.
MIN_CONTRAST = 3.0

# Global cap-band ratios keep mark sizes and gaps consistent across vendors.
MARK_HEIGHT = 1.45
MARK_GAP = 0.3
# Allow rounding error at the square's edge.
MARK_FIT_SLACK = 1.01

# Upstream artwork tolerates lower contrast than a tint chosen here.
ART_MIN_CONTRAST = 1.5

TEXT_TAG = re.compile(r'<(path|g|defs|circle|rect|ellipse|polygon|polyline)\b')
SVG_OPEN = re.compile(r'<svg\b[^>]*>', re.I)
VIEW_BOX = re.compile(r'viewBox="([^"]+)"')


def fetch(url):
    with urllib.request.urlopen(url) as response:
        return response.read().decode('utf8')


def inner(svg):
    """The markup inside the root <svg>, plus its viewBox."""
    match = SVG_OPEN.search(svg)
    if match is None:
        raise ValueError('not an svg document')
    box = VIEW_BOX.search(svg[:match.end()])
    if box is None:
        raise ValueError('no viewBox')
    body = svg[match.end():svg.rindex('</svg>')]
    # Re-apply the root's inherited paint on a wrapper; drop <title> because the
    # row already supplies the accessible name.
    body = re.sub(r'<title>.*?</title>', '', body, flags=re.S)
    paint = ''
    for name in ('fill', 'fill-rule'):
        found = re.search(r'\b%s="([^"]*)"' % name, match.group(0))
        if found is not None:
            paint += ' %s="%s"' % (name, found.group(1))
    return box.group(1), '<g%s>%s</g>' % (paint, body)


def paths_of(body):
    """Every `d` attribute in the markup, in document order."""
    return re.findall(r'\sd="([^"]+)"', body)


def subpath_boxes(d):
    """Per-subpath ink boxes of one path, split at every moveTo."""
    rec = RecordingPen()
    parse_path(d, rec)
    groups, current = [], []
    for op, args in rec.value:
        if op == 'moveTo' and current:
            groups.append(current)
            current = []
        current.append((op, args))
    if current:
        groups.append(current)
    out = []
    for group in groups:
        part = RecordingPen()
        part.value = group
        pen = BoundsPen(None)
        part.replay(pen)
        if pen.bounds is not None:
            out.append(pen.bounds)
    return out


def cap_band(boxes):
    """Infer (top, baseline) from the common baseline and tallest flat letter."""
    if not boxes:
        return None
    bottoms = {}
    for box in boxes:
        bottoms[round(box[3], 1)] = bottoms.get(round(box[3], 1), 0) + 1
    baseline = max(bottoms.items(), key=lambda kv: (kv[1], kv[0]))[0]
    tallest = None
    for box in boxes:
        if abs(box[3] - baseline) > 0.75:
            continue
        height = baseline - box[1]
        if height > 0 and (tallest is None or height > tallest):
            tallest = height
    if tallest is None:
        return None
    return baseline - tallest, baseline


def luminance(hex_colour):
    value = hex_colour.lstrip('#')
    if len(value) == 3:
        value = ''.join(c * 2 for c in value)
    channels = []
    for i in (0, 2, 4):
        c = int(value[i:i + 2], 16) / 255
        channels.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    high, low = max(la, lb), min(la, lb)
    return (high + 0.05) / (low + 0.05)


def tint(body, colour):
    """A mono artwork painted in one colour instead of currentColor."""
    return re.sub(r'(fill=")currentColor(")', r'\g<1>%s\g<2>' % colour, body)


def recolour_illegible(body, canvas):
    """Replace only an illegible dominant fill; highlights and non-literal
    colours such as gradients and currentColor stay unchanged."""
    weight = {}
    for tag in re.findall(r'<path[^>]*>', body):
        colour = re.search(r'fill="(#[^"]+)"', tag)
        d = re.search(r'\sd="([^"]+)"', tag)
        if colour is None or d is None:
            continue
        boxes = subpath_boxes(d.group(1))
        if not boxes:
            continue
        weight[colour.group(1)] = weight.get(colour.group(1), 0) + sum(
            (box[2] - box[0]) * (box[3] - box[1]) for box in boxes
        )
    if not weight:
        return body
    dominant = max(weight.items(), key=lambda item: item[1])[0]
    if contrast(dominant, canvas) >= ART_MIN_CONTRAST:
        return body
    return body.replace('fill="%s"' % dominant, 'fill="currentColor"')


def scale_mark(body, scale, dx, dy):
    return '<g transform="translate(%.4f %.4f) scale(%.6f)">%s</g>' % (dx, dy, scale, body)


def ink_box(body):
    """The union ink box of every subpath in a markup fragment."""
    boxes = []
    for d in paths_of(body):
        boxes.extend(subpath_boxes(d))
    if not boxes:
        raise ValueError('no measurable ink')
    return (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))


def split_clusters(boxes):
    """Split a ready-made lockup at its widest horizontal ink gap."""
    ordered = sorted(boxes, key=lambda box: box[0])
    if len(ordered) < 2:
        return ordered, []
    best, at = -1.0, 0
    for i in range(1, len(ordered)):
        gap = ordered[i][0] - max(box[2] for box in ordered[:i])
        if gap > best:
            best, at = gap, i
    return ordered[:at], ordered[at:]


def split_markup(body):
    """Split local artwork at its widest gap, or return None when ambiguous."""
    # Measure leaf shapes; a wrapper would make the whole artwork one element.
    leaf = r'<(?:path|circle|rect|ellipse|polygon|polyline)\b'
    elements = [
        m.group(0)
        for m in re.finditer(leaf + r'[^>]*?(?:/>|>.*?</(?:path|circle|rect|ellipse|polygon|polyline)>)', body, re.S)
    ]
    measured = []
    for element in elements:
        d = re.search(r'\sd="([^"]+)"', element)
        if d is None:
            continue
        boxes = subpath_boxes(d.group(1))
        if not boxes:
            continue
        measured.append((min(b[0] for b in boxes), max(b[2] for b in boxes), element))
    if len(measured) < 2:
        return None
    measured.sort(key=lambda item: item[0])
    best, at = -1.0, 0
    for i in range(1, len(measured)):
        gap = measured[i][0] - max(item[1] for item in measured[:i])
        if gap > best:
            best, at = gap, i
    if best <= 0:
        return None
    return ''.join(item[2] for item in measured[:at]), ''.join(item[2] for item in measured[at:])


def compose_lockup(layers, word, boxes, text_boxes):
    """Compose existing lockup artwork; span the full width so the mark keeps
    its place while the viewBox height follows the wordmark's capital band."""
    band = cap_band(text_boxes)
    if band is None:
        raise ValueError('lockup has no measurable wordmark')
    cap_top, baseline = band
    left = min(box[0] for box in boxes)
    right = max(box[2] for box in boxes)
    groups = ''.join('<g class="%s">%s</g>' % (cls, body) for cls, body in layers)
    defs = ''.join(
        m.group(0) for m in re.finditer(r'<defs>.*?</defs>', ''.join(b for _, b in layers), re.S)
    )
    svg = '<svg fill="none" viewBox="%.4f %.4f %.4f %.4f" data-combine-word="%s" xmlns="http://www.w3.org/2000/svg">%s%s</svg>' % (
        left, cap_top, right - left, baseline - cap_top, word, defs, groups,
    )
    return re.sub(r'>\s+<', '><', svg).strip()


def compose(brand, mark_body, mark_box, text_body, text_box, colour_body, word, keep=1.0, skip=0.0):
    """One lockup: the mark, the gap, then the wordmark, on a cap-band viewBox."""
    mark_w, mark_h = mark_box[2], mark_box[3]
    # Measure ink rather than viewBoxes, which may contain padding or trailing space.
    text_ink = ink_box(text_body)
    text_w, text_h = text_ink[2] - text_ink[0], text_ink[3] - text_ink[1]
    mark_ink = ink_box(mark_body)

    boxes = []
    for d in paths_of(text_body):
        boxes.extend(subpath_boxes(d))
    band = cap_band(boxes)
    if band is None:
        raise ValueError('could not measure the wordmark')
    cap_top, baseline = band
    cap_height = baseline - cap_top

    # Size marks to a consistent square; constrain unusually wide artwork by
    # width so it cannot push the wordmark right.
    text_scale = 1.0 / cap_height  # text units -> composed units (cap band = 1)
    mark_height = MARK_HEIGHT
    mark_ink_width = mark_ink[2] - mark_ink[0]
    mark_scale = mark_height / mark_h
    if mark_ink_width > MARK_FIT_SLACK * mark_h:
        mark_scale = mark_height / mark_ink_width
    mark_left = mark_ink[0] * mark_scale
    mark_width = (mark_ink[2] - mark_ink[0]) * mark_scale
    gap = MARK_GAP
    # `skip` and `keep` crop unwanted lettering from the wordmark's ends.
    art_width = text_w * text_scale
    span = (keep - skip) * art_width
    text_width = span

    # Centre the mark's own box on the cap band and preserve each ink origin;
    # width-constrained marks then sit on the band instead of floating above it.
    mark_dy = (1 - mark_h * mark_scale) / 2 - mark_box[1] * mark_scale
    text_dy = -cap_top * text_scale
    text_dx = mark_width + gap - skip * art_width - text_ink[0] * text_scale

    width = mark_width + gap + span
    # Share one wordmark between both canvases; only the mark needs two layers.
    mark_layers = []
    if colour_body is not None:
        mark_layers.append('<g class="dsh-combine-mark-color">%s</g>' % scale_mark(colour_body, mark_scale, -mark_left, mark_dy))
    mono_class = 'dsh-combine-mark-mono' if colour_body is not None else 'dsh-combine-mark-mono dsh-combine-mark-color'
    mark_layers.append('<g class="%s">%s</g>' % (mono_class, scale_mark(mark_body, mark_scale, -mark_left, mark_dy)))
    text_layer = '<g class="dsh-combine-text">%s</g>' % scale_mark(text_body, text_scale, text_dx, text_dy)
    # Every source may carry <defs> (gradients, clip paths); ids are namespaced per
    # icon upstream, so they can be concatenated without colliding.
    defs = ''.join(
        m.group(0) for m in re.finditer(r'<defs>.*?</defs>', (mark_body or '') + (text_body or '') + (colour_body or ''), re.S)
    )

    # Clip in the composed space; the narrowed viewBox reserves only kept text.
    if skip > 0 or keep < 1.0:
        clip_id = 'crop-%s' % brand
        defs += '<clipPath id="%s"><rect x="%.4f" y="-1" width="%.4f" height="3"/></clipPath>' % (
            clip_id, mark_width + gap, span,
        )
        text_layer = '<g clip-path="url(#%s)">%s</g>' % (clip_id, text_layer)

    svg = '<svg fill="none" viewBox="0 0 %.4f 1" data-combine-word="%s" xmlns="http://www.w3.org/2000/svg">%s%s%s</svg>' % (
        width, word, defs, ''.join(mark_layers), text_layer,
    )
    return re.sub(r'>\s+<', '><', svg).strip()


def main():
    copy = json.load(open(COPY, encoding='utf8'))
    brands = set()
    for rule in copy['brands']['models']:
        brands.add(rule['brand'])
    for value in copy['brands']['providers'].values():
        brands.add(value)

    toc_raw = fetch('%s/es/toc.js' % REACT)
    start, depth, end = toc_raw.index('['), 0, None
    for i in range(start, len(toc_raw)):
        if toc_raw[i] == '[':
            depth += 1
        elif toc_raw[i] == ']':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    toc = {e['id'].lower(): e for e in json.loads(toc_raw[start:end])}

    # `brands.lockups` can override each half and the displayed word.
    overrides = {k: v for k, v in (copy['brands'].get('lockups') or {}).items() if k != 'note'}

    # Fetch each required file once; variant flags avoid requests for absent art.
    jobs = {}
    plan = {}
    for brand in sorted(brands):
        spec = overrides.get(brand) or {}
        local = os.path.join(COMBINE_SRC, spec.get('local') or ('%s.svg' % brand))
        # A ready-made lockup (hand-provided, or Lobe's `-brand` pair) needs neither
        # a separate mark nor a separate wordmark, so it skips the mark/text plan.
        if spec.get('lockup') or os.path.exists(local):
            entry = toc.get(brand.replace('-', ''))
            urls = {}
            if not os.path.exists(local):
                urls = {
                    'mark': '%s/%s-brand.svg' % (STATIC, brand),
                    'color': '%s/%s-brand-color.svg' % (STATIC, brand),
                }
            plan[brand] = (entry, urls)
            jobs.update({url: None for url in urls.values()})
            continue
        mark_id = spec.get('mark', brand)
        text_id = spec.get('text', brand)
        mark_entry = toc.get(mark_id.replace('-', ''))
        text_entry = toc.get(text_id.replace('-', ''))
        entry = mark_entry or text_entry
        # Static artwork also covers vendors absent from the React catalog;
        # each half reads its own variant flags.
        urls = {'mark': '%s/%s.svg' % (STATIC, mark_id), 'text': '%s/%s-text.svg' % (STATIC, text_id)}
        if not ((text_entry or {}).get('param') or {}).get('hasText', True):
            urls.pop('text')
        if ((mark_entry or {}).get('param') or {}).get('hasColor'):
            urls['color'] = '%s/%s-color.svg' % (STATIC, mark_id)
        plan[brand] = (entry, urls)
        jobs.update({url: None for url in urls.values()})

    from concurrent.futures import ThreadPoolExecutor

    def grab(url):
        try:
            return url, fetch(url)
        except Exception:
            return url, None

    with ThreadPoolExecutor(max_workers=8) as pool:
        for url, text in pool.map(grab, list(jobs)):
            jobs[url] = text

    os.makedirs(OUT_DIR, exist_ok=True)
    written, skipped, skipped_toc, tinted, mono_only = [], [], [], [], []
    for brand in sorted(brands):
        entry, urls = plan[brand]
        spec = overrides.get(brand) or {}
        word = spec.get('word') or (entry or {}).get('title') or brand
        local = os.path.join(COMBINE_SRC, spec.get('local') or ('%s.svg' % brand))
        if spec.get('lockup') or os.path.exists(local):
            try:
                if os.path.exists(local):
                    with open(local, encoding='utf8') as fh:
                        art = inner(fh.read())[1]
                    halves = split_markup(art)
                    if halves is None:
                        raise ValueError('cannot tell the mark from the wordmark')
                    mark_part, text_part = halves
                    # Remove inline fills that override presentation attributes;
                    # absent fills default to currentColor below.
                    mark_part = re.sub(r'style="[^"]*?"', lambda m: m.group(0) if 'fill' not in m.group(0) else 'style=""', mark_part)
                    text_part = re.sub(r'style="[^"]*?"', lambda m: m.group(0) if 'fill' not in m.group(0) else 'style=""', text_part)
                    if 'fill=' not in mark_part:
                        mark_part = '<g fill="currentColor">%s</g>' % mark_part
                    if 'fill=' not in text_part:
                        text_part = '<g fill="currentColor">%s</g>' % text_part
                    # Local art is mono; its colour layer uses a legible copy tint.
                    colour_body = None
                    tint_colour = spec.get('tint')
                    if tint_colour is not None:
                        if contrast(tint_colour, LIGHT_CANVAS) >= MIN_CONTRAST:
                            colour_body = tint(mark_part, tint_colour)
                            tinted.append(brand)
                        else:
                            mono_only.append((brand, tint_colour))
                    mark_ink = ink_box(mark_part)
                    text_ink = ink_box(text_part)
                    svg = compose(
                        brand,
                        mark_part,
                        [mark_ink[0], mark_ink[1], mark_ink[2] - mark_ink[0], mark_ink[3] - mark_ink[1]],
                        text_part,
                        [text_ink[0], text_ink[1], text_ink[2] - text_ink[0], text_ink[3] - text_ink[1]],
                        colour_body, word, 1.0, float(spec.get('textFrom', 0.0)),
                    )
                else:
                    mono = inner(jobs[urls['mark']])[1]
                    colour = inner(jobs[urls['color']])[1] if jobs.get(urls.get('color')) is not None else None
                    layers = []
                    if colour is not None:
                        layers.append(('dsh-combine-mark-color', colour))
                    layers.append((
                        'dsh-combine-mark-mono' if colour is not None else 'dsh-combine-mark-mono dsh-combine-mark-color',
                        mono,
                    ))
                    boxes = []
                    for d in paths_of(mono):
                        boxes.extend(subpath_boxes(d))
                    _, text_boxes = split_clusters(boxes)
                    svg = compose_lockup(layers, word, boxes, text_boxes or boxes)
            except Exception as error:
                skipped.append((brand, 'lockup failed: %s' % error))
                continue
            with open(os.path.join(OUT_DIR, '%s.svg' % brand), 'w', encoding='utf8', newline='\n') as fh:
                fh.write(svg + '\n')
            written.append(brand)
            continue
        # The React catalog supplies the brand colour.
        brand_colour = (entry or {}).get('color') or '#000'
        if entry is None:
            skipped_toc.append(brand)

        try:
            mark_box_s, mark_body = inner(jobs[urls['mark']])
            text_box_s, text_body = inner(jobs[urls['text']])
        except Exception as error:
            skipped.append((brand, 'missing mark/text (%s)' % error))
            continue

        colour_body = None
        art = inner(jobs[urls['color']])[1] if jobs.get(urls.get('color')) is not None else None
        if art is not None:
            # The artwork is kept; only the fills that cannot be read on the ivory
            # canvas become `currentColor` (Kimi's white K, while its blue dot stays).
            colour_body = recolour_illegible(art, LIGHT_CANVAS)
        elif contrast(brand_colour, LIGHT_CANVAS) >= MIN_CONTRAST:
            # No colour artwork at all: tint the mono mark with Lobe's brand colour,
            # but only when that colour is legible on the ivory canvas.
            colour_body = tint(mark_body, brand_colour)
            tinted.append(brand)
        else:
            mono_only.append((brand, brand_colour))

        def box_of(spec):
            return [float(x) for x in re.split(r'[ ,]+', spec.strip())]

        try:
            svg = compose(brand, mark_body, box_of(mark_box_s), text_body, box_of(text_box_s),
                          colour_body, spec.get('word') or (entry or {}).get('title') or brand,
                          float(spec.get('keep', 1.0)))
        except Exception as error:
            skipped.append((brand, 'compose failed: %s' % error))
            continue

        # newline='' keeps the file LF on Windows too: git normalises on commit, but
        # a CRLF working copy makes every later diff look dirty for no reason.
        with open(os.path.join(OUT_DIR, '%s.svg' % brand), 'w', encoding='utf8', newline='\n') as fh:
            fh.write(svg + '\n')
        written.append(brand)

    total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
    print('wrote %d lockups to packages/assets/src/icons/combine (%d B)' % (len(written), total))
    print('  colour layer from Lobe artwork : %d' % (len(written) - len(tinted) - len(mono_only)))
    print('  colour layer tinted (no artwork): %s' % (', '.join(tinted) or '—'))
    print('  mono only (tint fails contrast on light): %s' % (
        ', '.join('%s %s' % t for t in mono_only) or '—'))
    print('  skipped: %s' % (', '.join('%s (%s)' % t for t in skipped) or '—'))
    print('  composed without a toc entry (default ratios, currentColor): %s' % (', '.join(skipped_toc) or '—'))
    print('\ncontrast of every brand colour on the two canvases:')
    for brand in sorted(brands):
        entry = toc.get(brand.replace('-', ''))
        if entry is None:
            continue
        colour = entry.get('color') or '#000'
        print('  %-14s %-9s light %5.2f  dark %5.2f%s' % (
            brand, colour, contrast(colour, LIGHT_CANVAS), contrast(colour, DARK_CANVAS),
            '' if contrast(colour, LIGHT_CANVAS) >= MIN_CONTRAST else '   <- light falls back to currentColor'))


if __name__ == '__main__':
    sys.exit(main())
