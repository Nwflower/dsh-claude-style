import fc from 'fast-check'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { TEST_SKIN } from './vocabulary'

// Every spec file runs against the specs' own vocabulary (D73); a spec that
// needs another answer hands its own seam over at its top.
adoptSkin(TEST_SKIN)

// A property draws its inputs from one fixed seed, so a red run reads the same
// on every machine and a counterexample is reproduced by running it again.
// Searching wider is a deliberate act — another seed, more runs — and whatever
// it finds joins the property's own examples (D87).
fc.configureGlobal({ seed: 20261019 })
