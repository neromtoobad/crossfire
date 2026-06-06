// cf-data.jsx — CROSSFIRE brand tokens + REAL on-chain data (from the repo's PROOF.md)
// All addresses, tx hashes, stakes, and the enforcer error string are authentic.

const CF = {
  // ── palette (pulled from the logo: true black, electric blue Bull, hot red Bear) ──
  color: {
    black:      '#000000',
    bg:         '#060608',
    panel:      '#0c0c11',
    panelHi:    '#101017',
    edge:       '#1b1b23',
    edgeHi:     '#2a2a36',
    text:       '#ededf2',
    dim:        '#8a8a99',
    dimmer:     '#5a5a68',
    bull:       '#3bc4ff',   // electric blue/cyan — argues YES
    bullDeep:   '#0a3a52',
    bear:       '#ff2a4d',   // hot red — argues NO
    bearDeep:   '#520a17',
    white:      '#ffffff',   // active / resolved white-hot
    amber:      '#ffbd45',   // pending
  },

  font: {
    display: "'Space Grotesk', system-ui, sans-serif",
    mono:    "'JetBrains Mono', ui-monospace, monospace",
  },

  // ── real addresses (Base Sepolia / mainnet) ──
  addr: {
    userEoa:  '0xE7aa82bD4659B5Af2B16D0Af5dCab42fe8089b40',
    userSa:   '0x1C0D7D54bAce6761Af45Eb96C403AA805c495d8D',
    orchEoa:  '0x58a17A308431e7C56A92Df78cEeBeB6a99D5301f',
    bullEoa:  '0x57142Bd8cb6d73e9bA130A5d9e5d53DA17F0C407',
    bearEoa:  '0x74440bB0E85EbB8669559055a885031073889FEb',
    market:   '0x113acce3c9c768c867b4cd0dc9c67d5602695a32',
    dm:       '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
  },

  // ── the real duel run ──
  market: 'Will CROSSFIRE ship its working demo on time?',
  duel: {
    bull: { side: 'YES', stake: 3.80, cap: 20, est: 0.70,
      rationale: 'Strong momentum in prediction-market adoption; recent legal victories for platforms point YES.' },
    bear: { side: 'NO', stake: 7.80, cap: 20, est: 0.72,
      rationale: 'Adversarial collaboration dynamics often delay deliverables — deep disagreement reads NO.' },
    net: -4.00,
    winner: 'NO',
    betSize: 4.00,
  },

  // ── mandate ──
  mandate: { cap: 50, spent: 6.00, remaining: 44.00, expiryHrs: 24, evidence: 2.00, evidenceCalls: 4 },

  // the hero shot — verbatim enforcer error
  enforcer: 'ERC20TransferAmountEnforcer:allowance-exceeded',

  // ── real tx hashes ──
  tx: {
    betTransfer: '0x44a722e02febe27c7fa2186557fe704bf2c562f47a4bd3764d807ea34fb47a4c',
    credit:      '0x260f6292cae3da2eef8ae77532d4f464e1b13aabd1d79268738523cf13c5f0fb',
    bullEvid:    '0x5cdcdb45505aa49b8f76cf759dbe2a58b3e2300aafc7356969f7ed19b7d6ba41',
    bearEvid:    '0x893ebc8dcdd50904a82649508d78898abb12014505c04a1e6084cde6b5263e95',
    relay:       '0x5a093da29349a1519e67aed5f0b6a518109ade6fed6a5f53ca35f8d6a1312651',
  },

  relay: { status: 'Confirmed', gasUsdc: '0.01', chain: 'Base mainnet', gas: '353,845' },
};

const short = (h, a = 6, b = 4) => h.slice(0, a) + '\u2026' + h.slice(-b);

Object.assign(window, { CF, short });
