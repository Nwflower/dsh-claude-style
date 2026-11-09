import fc from 'fast-check'
import { adoptSkin } from '@dsh-claude-style/engine/skin'
import { TEST_SKIN } from './vocabulary'

// Specs use the test vocabulary unless they provide their own seam (D73).
adoptSkin(TEST_SKIN)

// Fix the property seed so failures reproduce across machines (D87).
fc.configureGlobal({ seed: 20261019 })
