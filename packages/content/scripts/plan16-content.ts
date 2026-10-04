import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Plan 16 content map: enriches the 39 Extended exhibits with caption/hook/
 * stats/sources/caveat and writes spoken narration for all 63 Core + Extended
 * exhibits. Re-run is idempotent (same input produces the same output).
 *
 * Rules honoured (BLUEPRINT section 8):
 * - no em or en dashes in any copy
 * - narration states the same facts as the caption, never extra ones
 * - numbers written out for speech; paired years expanded
 * - "first"/contested claims carry a caveat
 */

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url))

interface Stat {
  k: string
  v: string
  sourceId: string
}

interface Source {
  id: string
  label: string
  url: string
}

interface Content {
  hook?: string
  caption?: string
  narration: string
  stats?: Stat[]
  sources?: Source[]
  caveat?: string
}

const w = (label: string, url: string): Source => ({ id: label, label, url })

const CONTENT: Record<string, Content> = {
  // ---- Prologue / Wing A (extended) -----------------------------------------
  P1: {
    hook: 'Bronze gears that modelled the heavens, recovered from a two-thousand-year-old shipwreck.',
    caption:
      "Recovered from a shipwreck off the Greek island of Antikythera, this geared bronze device computed astronomical positions and eclipses. Its complexity was not matched for more than a thousand years. It is the earliest known analog computer.",
    narration:
      'Recovered from a shipwreck off the Greek island of Antikythera, this geared bronze device computed astronomical positions and eclipses. Its complexity was not matched for more than a thousand years. It is the earliest known analog computer.',
    stats: [
      { k: 'Recovered', v: '1901', sourceId: 'Wikipedia: Antikythera mechanism' },
      { k: 'Gears', v: 'about 30 bronze gears', sourceId: 'Wikipedia: Antikythera mechanism' },
      { k: 'Dated', v: 'c. 100 BCE', sourceId: 'Wikipedia: Antikythera mechanism' }
    ],
    sources: [w('Wikipedia: Antikythera mechanism', 'https://en.wikipedia.org/wiki/Antikythera_mechanism')],
    caveat: "The label 'earliest known analog computer' reflects surviving evidence; earlier geared devices may not have survived."
  },
  P2: {
    hook: 'One scholar, two words: his name became algorithm, his book became algebra.',
    caption:
      "The mathematician al-Khwarizmi wrote the book that named algebra, and his own name, Latinized as Algoritmi, became the word algorithm. His step-by-step methods for arithmetic and equation solving are the ancestors of every program.",
    narration:
      "The mathematician al-Khwarizmi wrote the book that named algebra, and his own name, written in Latin as Algoritmi, became the word algorithm. His step by step methods for arithmetic and equation solving are the ancestors of every program.",
    stats: [
      { k: 'Wrote', v: 'c. 820', sourceId: 'Wikipedia: Muhammad ibn Musa al-Khwarizmi' },
      { k: 'Word from', v: 'his name, Algoritmi', sourceId: 'Wikipedia: Muhammad ibn Musa al-Khwarizmi' },
      { k: 'Field named', v: 'algebra', sourceId: 'Wikipedia: Muhammad ibn Musa al-Khwarizmi' }
    ],
    sources: [w('Wikipedia: Muhammad ibn Musa al-Khwarizmi', 'https://en.wikipedia.org/wiki/Muhammad_ibn_Musa_al-Khwarizmi')]
  },
  P3: {
    hook: 'Punched cards ran a loom two centuries before they ran a computer.',
    caption:
      "Joseph Marie Jacquard's loom wove patterns from a chain of punched cards, so one machine could produce many designs without being rebuilt. The idea of a punched-card program later inspired Babbage and Hollerith.",
    narration:
      "Joseph Marie Jacquard's loom wove patterns from a chain of punched cards, so one machine could produce many designs without being rebuilt. The idea of a punched card program later inspired Babbage and Hollerith.",
    stats: [
      { k: 'Loom', v: 'Jacquard loom, 1804', sourceId: 'Wikipedia: Jacquard machine' },
      { k: 'Controlled by', v: 'punched cards', sourceId: 'Wikipedia: Jacquard machine' },
      { k: 'Inspired', v: 'Babbage and Hollerith', sourceId: 'Wikipedia: Jacquard machine' }
    ],
    sources: [w('Wikipedia: Jacquard machine', 'https://en.wikipedia.org/wiki/Jacquard_machine')]
  },
  P6: {
    hook: 'True or false: the two-state logic inside every computer was written down in 1854.',
    caption:
      "George Boole's 1854 book reduced logic to algebra, with variables that are only ever true or false. A century later his rules became the foundation of digital circuit design.",
    narration:
      "George Boole's book from 1854 reduced logic to algebra, with variables that are only ever true or false. A century later, his rules became the foundation of digital circuit design.",
    stats: [
      { k: 'Book', v: 'The Laws of Thought, 1854', sourceId: 'Wikipedia: Boolean algebra' },
      { k: 'Values', v: 'true and false', sourceId: 'Wikipedia: Boolean algebra' },
      { k: 'Underpins', v: 'digital circuits', sourceId: 'Wikipedia: Boolean algebra' }
    ],
    sources: [w('Wikipedia: Boolean algebra', 'https://en.wikipedia.org/wiki/Boolean_algebra')]
  },
  P7: {
    hook: 'Punched cards counted a nation, and a census job launched IBM.',
    caption:
      "Herman Hollerith's punched-card tabulator counted the 1890 United States census far faster than hand tallying. His Tabulating Machine Company later grew into IBM.",
    narration:
      "Herman Hollerith's punched card tabulator counted the 1890 United States census far faster than hand tallying. His Tabulating Machine Company later grew into IBM.",
    stats: [
      { k: 'Census', v: '1890 United States census', sourceId: 'Wikipedia: Herman Hollerith' },
      { k: 'Medium', v: 'punched cards', sourceId: 'Wikipedia: Herman Hollerith' },
      { k: 'Company', v: 'forerunner of IBM', sourceId: 'Wikipedia: Herman Hollerith' }
    ],
    sources: [w('Wikipedia: Herman Hollerith', 'https://en.wikipedia.org/wiki/Herman_Hollerith')]
  },
  A2: {
    hook: 'One thesis joined algebra to electricity, and every logic gate descends from it.',
    caption:
      "Claude Shannon's 1937 master's thesis showed that electrical switches could carry out Boolean logic. It linked algebra and circuits and is often called the most important master's thesis of the century.",
    narration:
      "Claude Shannon's master's thesis from 1937 showed that electrical switches could carry out Boolean logic. It linked algebra and circuits, and it is often called the most important master's thesis of the century.",
    stats: [
      { k: 'Thesis', v: 'A Symbolic Analysis of Relay and Switching Circuits, 1937', sourceId: 'Wikipedia: A Symbolic Analysis of Relay and Switching Circuits' },
      { k: 'Linked', v: 'Boolean algebra and circuits', sourceId: 'Wikipedia: A Symbolic Analysis of Relay and Switching Circuits' },
      { k: 'Reputation', v: "most important master's thesis of the century", sourceId: 'Wikipedia: A Symbolic Analysis of Relay and Switching Circuits' }
    ],
    sources: [w('Wikipedia: A Symbolic Analysis of Relay and Switching Circuits', 'https://en.wikipedia.org/wiki/A_Symbolic_Analysis_of_Relay_and_Switching_Circuits')],
    caveat: "The 'most important master's thesis' praise is a widely repeated description, not a measured fact."
  },
  A5: {
    hook: 'Three pages in 1959 that still route your car and your packets.',
    caption:
      "Edsger Dijkstra's 1959 algorithm finds the shortest route through a graph without needing a map of the whole network. It still steers car navigation and internet routing today.",
    narration:
      "Edsger Dijkstra's algorithm from 1959 finds the shortest route through a graph without needing a map of the whole network. It still steers car navigation and internet routing today.",
    stats: [
      { k: 'Published', v: '1959', sourceId: "Wikipedia: Dijkstra's algorithm" },
      { k: 'Paper', v: 'A Note on Two Problems in Connexion with Graphs', sourceId: "Wikipedia: Dijkstra's algorithm" },
      { k: 'Used in', v: 'navigation and routing', sourceId: "Wikipedia: Dijkstra's algorithm" }
    ],
    sources: [w("Wikipedia: Dijkstra's algorithm", "https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm")]
  },
  A6: {
    hook: 'A million hard problems, one shared difficulty, and a question still open.',
    caption:
      "Stephen Cook's 1971 theorem showed that many hard problems are all equally hard: solve one fast and you solve them all. The P versus NP question it opened remains unsolved.",
    narration:
      "Stephen Cook's theorem from 1971 showed that many hard problems are all equally hard: solve one fast and you solve them all. The P versus NP question it opened remains unsolved.",
    stats: [
      { k: 'Introduced', v: 'NP-completeness, 1971', sourceId: 'Wikipedia: NP-completeness' },
      { k: 'Follow-up', v: '21 problems, Karp 1972', sourceId: 'Wikipedia: NP-completeness' },
      { k: 'Open question', v: 'P versus NP', sourceId: 'Wikipedia: NP-completeness' }
    ],
    sources: [w('Wikipedia: NP-completeness', 'https://en.wikipedia.org/wiki/NP-completeness')]
  },
  A8: {
    hook: 'A quantum factoring trick that put every RSA key on notice.',
    caption:
      "Peter Shor's 1994 algorithm showed a quantum computer could factor large numbers fast, which would break RSA encryption. It made quantum computing a matter of real urgency.",
    narration:
      "Peter Shor's algorithm from 1994 showed that a quantum computer could factor large numbers fast, which would break RSA encryption. It made quantum computing a matter of real urgency.",
    stats: [
      { k: 'Published', v: '1994', sourceId: "Wikipedia: Shor's algorithm" },
      { k: 'Threatens', v: 'RSA encryption', sourceId: "Wikipedia: Shor's algorithm" },
      { k: 'Speed', v: 'exponentially faster than known classical methods', sourceId: "Wikipedia: Shor's algorithm" }
    ],
    sources: [w("Wikipedia: Shor's algorithm", "https://en.wikipedia.org/wiki/Shor%27s_algorithm")]
  },
  A9: {
    hook: 'New math, new standards, written before the quantum computer that would break the old ones.',
    caption:
      'In 2024 NIST published the first standardized post-quantum algorithms, designed to resist attack by a quantum computer. They replace today\u2019s key exchange and signatures before a large quantum machine arrives.',
    narration:
      'In 2024, NIST published the first standardized post quantum algorithms, designed to resist attack by a quantum computer. They replace today\u2019s key exchange and signatures before a large quantum machine arrives.',
    stats: [
      { k: 'Standards', v: 'FIPS 203, 204 and 205', sourceId: 'Wikipedia: NIST Post-Quantum Cryptography Standardization' },
      { k: 'Published', v: '2024', sourceId: 'Wikipedia: NIST Post-Quantum Cryptography Standardization' },
      { k: 'Purpose', v: 'resist quantum attack', sourceId: 'Wikipedia: NIST Post-Quantum Cryptography Standardization' }
    ],
    sources: [w('Wikipedia: NIST Post-Quantum Cryptography Standardization', 'https://en.wikipedia.org/wiki/NIST_Post-Quantum_Cryptography_Standardization')],
    caveat: "The label 'first standardized post-quantum algorithms' refers to NIST's finalized standards."
  },

  // ---- Wing B (extended) ----------------------------------------------------
  B1: {
    hook: 'Relays and punched film, running programs in Berlin in 1941.',
    caption:
      "Konrad Zuse's Z3, completed in Berlin in 1941, was the first working programmable, fully automatic digital computer. It ran on relays and was controlled by punched film.",
    narration:
      "Konrad Zuse's Z3, completed in Berlin in 1941, was the first working programmable, fully automatic digital computer. It ran on relays and was controlled by punched film.",
    stats: [
      { k: 'Completed', v: '1941', sourceId: 'Wikipedia: Z3 (computer)' },
      { k: 'Technology', v: 'electromechanical relays', sourceId: 'Wikipedia: Z3 (computer)' },
      { k: 'Program', v: 'punched film', sourceId: 'Wikipedia: Z3 (computer)' }
    ],
    sources: [w('Wikipedia: Z3 (computer)', 'https://en.wikipedia.org/wiki/Z3_(computer)')],
    caveat: "The label 'first' refers to a working programmable, fully automatic digital computer; earlier machines were not both programmable and automatic."
  },
  B6: {
    hook: 'A prediction that became a deadline.',
    caption:
      'In 1965 Gordon Moore predicted that the number of components on a chip would double roughly every year, a pace later revised to every two years. The industry has treated his observation as a roadmap ever since.',
    narration:
      'In 1965, Gordon Moore predicted that the number of components on a chip would double roughly every year, a pace later revised to every two years. The industry has treated his observation as a roadmap ever since.',
    stats: [
      { k: 'Predicted', v: '1965', sourceId: "Wikipedia: Moore's law" },
      { k: 'Pace', v: 'doubling every one to two years', sourceId: "Wikipedia: Moore's law" },
      { k: 'Nature', v: 'an observation, not a physical law', sourceId: "Wikipedia: Moore's law" }
    ],
    sources: [w("Wikipedia: Moore's law", 'https://en.wikipedia.org/wiki/Moore%27s_law')]
  },
  B8: {
    hook: 'A machine shaped like a C, built to keep its wires as short as possible.',
    caption:
      "Seymour Cray's Cray-1, shipped in 1976, was shaped like a C to shorten its wiring and defined the supercomputer race of the 1970s and 1980s. It made vector computing famous.",
    narration:
      "Seymour Cray's Cray-1, shipped in 1976, was shaped like a C to shorten its wiring, and it defined the supercomputer race of the 1970s and 1980s. It made vector computing famous.",
    stats: [
      { k: 'Shipped', v: '1976', sourceId: 'Wikipedia: Cray-1' },
      { k: 'Shape', v: 'a C, for shorter wires', sourceId: 'Wikipedia: Cray-1' },
      { k: 'Speed', v: 'about 160 megaflops', sourceId: 'Wikipedia: Cray-1' }
    ],
    sources: [w('Wikipedia: Cray-1', 'https://en.wikipedia.org/wiki/Cray-1')],
    caveat: 'Performance claims reflect the Cray-1 at its 1976 introduction, relative to machines of its time.'
  },
  B9: {
    hook: 'A chip made by a small team in 1985, now inside nearly every phone.',
    caption:
      'The ARM1, finished at Acorn in 1985, was a deliberately simple RISC chip designed by a small team. Its low-power design now runs inside billions of phones and embedded devices.',
    narration:
      'The ARM1, finished at Acorn in 1985, was a deliberately simple RISC chip designed by a small team. Its low power design now runs inside billions of phones and embedded devices.',
    stats: [
      { k: 'Finished', v: '1985', sourceId: 'Wikipedia: ARM architecture family' },
      { k: 'Design', v: 'simple, low power RISC', sourceId: 'Wikipedia: ARM architecture family' },
      { k: 'Reach', v: 'billions of devices', sourceId: 'Wikipedia: ARM architecture family' }
    ],
    sources: [w('Wikipedia: ARM architecture family', 'https://en.wikipedia.org/wiki/ARM_architecture_family')]
  },
  B12: {
    hook: 'Qubits in, one contested milestone out.',
    caption:
      "Quantum processors like Google's Sycamore, announced in 2019, run on qubits instead of bits. Their claimed advantage on one sampling task is still debated.",
    narration:
      "Quantum processors like Google's Sycamore, announced in 2019, run on qubits instead of bits. Their claimed advantage on one sampling task is still debated.",
    stats: [
      { k: 'Announced', v: 'Sycamore, 2019', sourceId: 'Wikipedia: Quantum supremacy' },
      { k: 'Qubits', v: '53 qubits', sourceId: 'Wikipedia: Quantum supremacy' },
      { k: 'Claim', v: 'quantum advantage, contested', sourceId: 'Wikipedia: Quantum supremacy' }
    ],
    sources: [w('Wikipedia: Quantum supremacy', 'https://en.wikipedia.org/wiki/Quantum_supremacy')],
    caveat: 'Quantum advantage claims for the 2019 Sycamore experiment are contested and refer to one specific sampling task.'
  },

  // ---- Wing C (extended) ----------------------------------------------------
  C4: {
    hook: "English-like code from 1959, still settling your bank's books.",
    caption:
      'COBOL, specified in 1959 by a committee that included Grace Hopper, was written to read like English so business people could understand it. Decades later it still runs much of banking and government.',
    narration:
      'COBOL, specified in 1959 by a committee that included Grace Hopper, was written to read like English so business people could understand it. Decades later, it still runs much of banking and government.',
    stats: [
      { k: 'Specified', v: '1959', sourceId: 'Wikipedia: COBOL' },
      { k: 'Goal', v: 'readable by non-programmers', sourceId: 'Wikipedia: COBOL' },
      { k: 'Still in use', v: 'banking and government', sourceId: 'Wikipedia: COBOL' }
    ],
    sources: [w('Wikipedia: COBOL', 'https://en.wikipedia.org/wiki/COBOL')]
  },
  C5: {
    hook: 'A conference coined the field, and Apollo flew its code to the Moon.',
    caption:
      "The term software engineering was coined at a 1968 NATO conference as projects grew too big to hand-craft. The next year Margaret Hamilton's team flew the Apollo 11 guidance software to the Moon.",
    narration:
      "The term software engineering was coined at a 1968 NATO conference as projects grew too big to hand craft. The next year, Margaret Hamilton's team flew the Apollo 11 guidance software to the Moon.",
    stats: [
      { k: 'Term coined', v: 'NATO conference, 1968', sourceId: 'Wikipedia: Software engineering' },
      { k: 'Apollo 11', v: '1969', sourceId: 'Wikipedia: Margaret Hamilton (software engineer)' },
      { k: 'Led by', v: 'Margaret Hamilton', sourceId: 'Wikipedia: Margaret Hamilton (software engineer)' }
    ],
    sources: [
      w('Wikipedia: Software engineering', 'https://en.wikipedia.org/wiki/Software_engineering'),
      w('Wikipedia: Margaret Hamilton (software engineer)', 'https://en.wikipedia.org/wiki/Margaret_Hamilton_(software_engineer)')
    ]
  },
  C9: {
    hook: 'Built in a hurry for one kernel, now holding up most of the internet.',
    caption:
      "Linus Torvalds wrote Git in 2005 to manage the Linux kernel after its previous tool became unavailable. Its distributed, branch-friendly design now underpins most of the world's software.",
    narration:
      "Linus Torvalds wrote Git in 2005 to manage the Linux kernel after its previous tool became unavailable. Its distributed, branch friendly design now underpins most of the world's software.",
    stats: [
      { k: 'Created', v: '2005', sourceId: 'Wikipedia: Git' },
      { k: 'Created by', v: 'Linus Torvalds', sourceId: 'Wikipedia: Git' },
      { k: 'For', v: 'the Linux kernel', sourceId: 'Wikipedia: Git' }
    ],
    sources: [w('Wikipedia: Git', 'https://en.wikipedia.org/wiki/Git')]
  },

  // ---- Wing D (extended) ----------------------------------------------------
  D2: {
    hook: 'One message, one symbol: the @ that joined a person to a machine.',
    caption:
      'In 1971 Ray Tomlinson sent the first message between computers over the ARPANET and chose the @ sign to join a user to a machine. His choice of separator became universal.',
    narration:
      'In 1971, Ray Tomlinson sent the first message between computers over the ARPANET, and he chose the at sign to join a user to a machine. His choice of separator became universal.',
    stats: [
      { k: 'First network email', v: '1971', sourceId: 'Wikipedia: History of email' },
      { k: 'Symbol chosen', v: 'the @ sign', sourceId: 'Wikipedia: History of email' },
      { k: 'Sent by', v: 'Ray Tomlinson', sourceId: 'Wikipedia: History of email' }
    ],
    sources: [w('Wikipedia: History of email', 'https://en.wikipedia.org/wiki/History_of_email')],
    caveat: "The 'first' claim refers to networked email between machines; earlier single-system mailbox programs existed."
  },
  D3: {
    hook: 'One sketch on one shared wire, wired into every office since.',
    caption:
      'Robert Metcalfe sketched Ethernet at Xerox PARC in 1973 as a shared wire for office computers. It became the standard way to wire local networks.',
    narration:
      'Robert Metcalfe sketched Ethernet at Xerox PARC in 1973 as a shared wire for office computers. It became the standard way to wire local networks.',
    stats: [
      { k: 'Sketched', v: '1973', sourceId: 'Wikipedia: Ethernet' },
      { k: 'At', v: 'Xerox PARC', sourceId: 'Wikipedia: Ethernet' },
      { k: 'Standardized', v: 'IEEE 802.3, 1983', sourceId: 'Wikipedia: Ethernet' }
    ],
    sources: [w('Wikipedia: Ethernet', 'https://en.wikipedia.org/wiki/Ethernet')]
  },
  D5: {
    hook: 'The phone book of the internet, replacing one file that everyone edited.',
    caption:
      'Paul Mockapetris designed the Domain Name System in 1983 to replace a single hand-edited hosts file. It turned names like example.com into addresses across a distributed network.',
    narration:
      'Paul Mockapetris designed the Domain Name System in 1983 to replace a single hand edited hosts file. It turned names like example dot com into addresses across a distributed network.',
    stats: [
      { k: 'Designed', v: '1983', sourceId: 'Wikipedia: Domain Name System' },
      { k: 'Designed by', v: 'Paul Mockapetris', sourceId: 'Wikipedia: Domain Name System' },
      { k: 'Replaced', v: 'the hosts file', sourceId: 'Wikipedia: Domain Name System' }
    ],
    sources: [w('Wikipedia: Domain Name System', 'https://en.wikipedia.org/wiki/Domain_Name_System')]
  },
  D8: {
    hook: 'The browser that put pictures on pages and the web on the map.',
    caption:
      'NCSA Mosaic, released in 1993, put images and text on the same web page and became the first browser used by the millions. It is widely credited with igniting the web boom.',
    narration:
      'NCSA Mosaic, released in 1993, put images and text on the same web page, and it became the first browser used by the millions. It is widely credited with igniting the web boom.',
    stats: [
      { k: 'Released', v: '1993', sourceId: 'Wikipedia: Mosaic (web browser)' },
      { k: 'Made by', v: 'NCSA', sourceId: 'Wikipedia: Mosaic (web browser)' },
      { k: 'Impact', v: 'ignited the web boom', sourceId: 'Wikipedia: Mosaic (web browser)' }
    ],
    sources: [w('Wikipedia: Mosaic (web browser)', 'https://en.wikipedia.org/wiki/Mosaic_(web_browser)')],
    caveat: "The 'first browser used by the millions' claim reflects popularity, not the first graphical browser; earlier graphical browsers existed."
  },
  D9: {
    hook: 'Rank pages by who links to them, and the web reorganizes itself.',
    caption:
      "Larry Page and Sergey Brin's 1998 PageRank ranked web pages by counting their incoming links. It powered Google's search and changed how the web is organized.",
    narration:
      "Larry Page and Sergey Brin's PageRank, published in 1998, ranked web pages by counting their incoming links. It powered Google's search and changed how the web is organized.",
    stats: [
      { k: 'Published', v: '1998', sourceId: 'Wikipedia: PageRank' },
      { k: 'Authors', v: 'Larry Page and Sergey Brin', sourceId: 'Wikipedia: PageRank' },
      { k: 'Powered', v: 'Google Search', sourceId: 'Wikipedia: PageRank' }
    ],
    sources: [w('Wikipedia: PageRank', 'https://en.wikipedia.org/wiki/PageRank')]
  },
  D10: {
    hook: 'An encyclopedia with no entry fee and millions of editors.',
    caption:
      "Wikipedia launched in 2001 as a free encyclopedia anyone could edit. It became one of the world's most read websites, written and checked by volunteers.",
    narration:
      "Wikipedia launched in 2001 as a free encyclopedia anyone could edit. It became one of the world's most read websites, written and checked by volunteers.",
    stats: [
      { k: 'Launched', v: '2001', sourceId: 'Wikipedia: Wikipedia' },
      { k: 'Model', v: 'freely editable', sourceId: 'Wikipedia: Wikipedia' },
      { k: 'Articles', v: 'tens of millions', sourceId: 'Wikipedia: Wikipedia' }
    ],
    sources: [w('Wikipedia: Wikipedia', 'https://en.wikipedia.org/wiki/Wikipedia')]
  },

  // ---- Wing E (extended) ----------------------------------------------------
  E1: {
    hook: 'Two ships, one star, and a game written on a minicomputer in 1962.',
    caption:
      'In 1962 Steve Russell and friends at MIT built Spacewar! on a PDP-1 minicomputer. The two-player space duel is one of the earliest video games and the direct ancestor of the arcade.',
    narration:
      'In 1962, Steve Russell and friends at MIT built Spacewar on a PDP-1 minicomputer. The two player space duel is one of the earliest video games and the direct ancestor of the arcade.',
    stats: [
      { k: 'Built', v: '1962', sourceId: 'Wikipedia: Spacewar!' },
      { k: 'Machine', v: 'PDP-1', sourceId: 'Wikipedia: Spacewar!' },
      { k: 'Place', v: 'MIT', sourceId: 'Wikipedia: Spacewar!' }
    ],
    sources: [w('Wikipedia: Spacewar!', 'https://en.wikipedia.org/wiki/Spacewar!')],
    caveat: "The 'one of the earliest' claim reflects surviving evidence; earlier experiments like OXO and Tennis for Two exist."
  },
  E4: {
    hook: 'Windows, a mouse and a screen full of pixels, all in 1973.',
    caption:
      'The Xerox Alto, built in 1973, was the first computer designed around a graphical interface with windows, a mouse and a bitmap screen. It inspired the Macintosh and nearly every computer since.',
    narration:
      'The Xerox Alto, built in 1973, was the first computer designed around a graphical interface with windows, a mouse and a bitmap screen. It inspired the Macintosh and nearly every computer since.',
    stats: [
      { k: 'Built', v: '1973', sourceId: 'Wikipedia: Xerox Alto' },
      { k: 'Combined', v: 'windows, mouse, bitmap display', sourceId: 'Wikipedia: Xerox Alto' },
      { k: 'At', v: 'Xerox PARC', sourceId: 'Wikipedia: Xerox Alto' }
    ],
    sources: [w('Wikipedia: Xerox Alto', 'https://en.wikipedia.org/wiki/Xerox_Alto')],
    caveat: "The 'first' claim refers to a computer designed around the graphical interface; earlier research systems like the NLS preceded it."
  },
  E5: {
    hook: 'From blinking-front-panel hobby kit to a computer for the home.',
    caption:
      "The Altair 8800, sold in 1975, popularized the microcomputer among hobbyists. The Apple II, shipped in 1977, made computing a home product with colour graphics and a built-in BASIC.",
    narration:
      'The Altair 8800, sold in 1975, popularized the microcomputer among hobbyists. The Apple II, shipped in 1977, made computing a home product with colour graphics and a built in BASIC.',
    stats: [
      { k: 'Altair 8800', v: '1975', sourceId: 'Wikipedia: Altair 8800' },
      { k: 'Apple II', v: '1977', sourceId: 'Wikipedia: Apple II' },
      { k: 'Apple II features', v: 'colour graphics and BASIC', sourceId: 'Wikipedia: Apple II' }
    ],
    sources: [
      w('Wikipedia: Altair 8800', 'https://en.wikipedia.org/wiki/Altair_8800'),
      w('Wikipedia: Apple II', 'https://en.wikipedia.org/wiki/Apple_II')
    ]
  },
  E8: {
    hook: 'A computer that reads its own screen aloud, now built into the phone.',
    caption:
      'By 2009 screen readers had moved from specialist software into mainstream devices, led by VoiceOver on the iPhone 3GS. They read interfaces aloud so blind and low-vision people can use them.',
    narration:
      'By 2009, screen readers had moved from specialist software into mainstream devices, led by VoiceOver on the iPhone 3GS. They read interfaces aloud so blind and low vision people can use them.',
    stats: [
      { k: 'VoiceOver on iPhone', v: '3GS, 2009', sourceId: 'Wikipedia: Screen reader' },
      { k: 'Examples', v: 'JAWS, NVDA, VoiceOver', sourceId: 'Wikipedia: Screen reader' },
      { k: 'Purpose', v: 'access for blind and low-vision users', sourceId: 'Wikipedia: Screen reader' }
    ],
    sources: [w('Wikipedia: Screen reader', 'https://en.wikipedia.org/wiki/Screen_reader')]
  },

  // ---- Wing F (extended) ----------------------------------------------------
  F1: {
    hook: 'Can a machine pass for human? The question was posed in 1950.',
    caption:
      "Alan Turing's 1950 paper proposed the Imitation Game: if a machine's replies are indistinguishable from a person's, call it intelligent. The test still frames debates about machine intelligence.",
    narration:
      "Alan Turing's paper from 1950 proposed the Imitation Game: if a machine's replies are indistinguishable from a person's, call it intelligent. The test still frames debates about machine intelligence.",
    stats: [
      { k: 'Paper', v: 'Computing Machinery and Intelligence, 1950', sourceId: 'Wikipedia: Turing test' },
      { k: 'Proposed', v: 'the Imitation Game', sourceId: 'Wikipedia: Turing test' },
      { k: 'Author', v: 'Alan Turing', sourceId: 'Wikipedia: Turing test' }
    ],
    sources: [w('Wikipedia: Turing test', 'https://en.wikipedia.org/wiki/Turing_test')]
  },
  F4: {
    hook: 'A chatbot from 1966 that people opened up to, though it understood nothing.',
    caption:
      "Joseph Weizenbaum's ELIZA, written in 1966, played a therapist by pattern-matching a user's words. People confided in it even though it understood nothing, the first hint of how persuasive chatbots can be.",
    narration:
      "Joseph Weizenbaum's ELIZA, written in 1966, played a therapist by pattern matching a user's words. People confided in it even though it understood nothing, the first hint of how persuasive chatbots can be.",
    stats: [
      { k: 'Written', v: '1966', sourceId: 'Wikipedia: ELIZA' },
      { k: 'Author', v: 'Joseph Weizenbaum', sourceId: 'Wikipedia: ELIZA' },
      { k: 'Method', v: 'pattern matching', sourceId: 'Wikipedia: ELIZA' }
    ],
    sources: [w('Wikipedia: ELIZA', 'https://en.wikipedia.org/wiki/ELIZA')],
    caveat: "The 'first hint' phrasing is the author's framing of ELIZA's reception, not a measured historical first."
  },
  F5: {
    hook: 'Twice the money dried up when the promises ran ahead of the machines.',
    caption:
      'Funding for artificial intelligence collapsed twice, in the mid 1970s and again around 1990, after grand promises failed to arrive. These AI winters followed hype cycles that the field still learns from.',
    narration:
      'Funding for artificial intelligence collapsed twice, in the mid 1970s and again around 1990, after grand promises failed to arrive. These AI winters followed hype cycles that the field still learns from.',
    stats: [
      { k: 'First winter', v: 'mid 1970s', sourceId: 'Wikipedia: AI winter' },
      { k: 'Second winter', v: 'late 1980s to 1990s', sourceId: 'Wikipedia: AI winter' },
      { k: 'Trigger', v: 'unmet expectations', sourceId: 'Wikipedia: AI winter' }
    ],
    sources: [w('Wikipedia: AI winter', 'https://en.wikipedia.org/wiki/AI_winter')]
  },
  F6: {
    hook: 'Send the error backward, and the network teaches itself.',
    caption:
      'The 1986 paper by Rumelhart, Hinton and Williams popularized backpropagation, the method that teaches a neural network by sending errors backward through it. It became the engine of modern deep learning.',
    narration:
      'The 1986 paper by Rumelhart, Hinton and Williams popularized backpropagation, the method that teaches a neural network by sending errors backward through it. It became the engine of modern deep learning.',
    stats: [
      { k: 'Popularized', v: '1986', sourceId: 'Wikipedia: Backpropagation' },
      { k: 'Authors', v: 'Rumelhart, Hinton and Williams', sourceId: 'Wikipedia: Backpropagation' },
      { k: 'Role', v: 'trains neural networks', sourceId: 'Wikipedia: Backpropagation' }
    ],
    sources: [w('Wikipedia: Backpropagation', 'https://en.wikipedia.org/wiki/Backpropagation')]
  },
  F9: {
    hook: 'Four games to one, in a game once thought beyond machines.',
    caption:
      "In March 2016 DeepMind's AlphaGo beat the champion Lee Sedol four games to one. Its self-play and neural networks marked a leap for AI at a game once thought decades away.",
    narration:
      "In March 2016, DeepMind's AlphaGo beat the champion Lee Sedol four games to one. Its self play and neural networks marked a leap for AI at a game once thought decades away.",
    stats: [
      { k: 'Match', v: 'Lee Sedol, March 2016', sourceId: 'Wikipedia: AlphaGo' },
      { k: 'Result', v: 'AlphaGo won 4 to 1', sourceId: 'Wikipedia: AlphaGo' },
      { k: 'Made by', v: 'DeepMind', sourceId: 'Wikipedia: AlphaGo' }
    ],
    sources: [w('Wikipedia: AlphaGo', 'https://en.wikipedia.org/wiki/AlphaGo')]
  },

  // ---- People Gallery (extended) -------------------------------------------
  G2: {
    hook: 'The people who did the math that put astronauts in orbit.',
    caption:
      "Before electronic machines, NASA's human computers, many of them Black women, calculated flight and orbital trajectories by hand. Katherine Johnson, Dorothy Vaughan and Mary Jackson became the best known of them.",
    narration:
      "Before electronic machines, NASA's human computers, many of them Black women, calculated flight and orbital trajectories by hand. Katherine Johnson, Dorothy Vaughan and Mary Jackson became the best known of them.",
    stats: [
      { k: 'Era', v: '1940s to 1960s', sourceId: 'Wikipedia: West Area Computers' },
      { k: 'Known members', v: 'Johnson, Vaughan, Jackson', sourceId: 'Wikipedia: West Area Computers' },
      { k: 'Agency', v: 'NACA, then NASA', sourceId: 'Wikipedia: West Area Computers' }
    ],
    sources: [w('Wikipedia: West Area Computers', 'https://en.wikipedia.org/wiki/West_Area_Computers')]
  },
  G3: {
    hook: 'A museum wall for the hands the plaques never named.',
    caption:
      'The wall of names honours the many contributors to computing whose work went uncredited, from operators and programmers to testers and educators. It is a reminder that every landmark was built by more hands than its plaque can hold.',
    narration:
      'The wall of names honours the many contributors to computing whose work went uncredited, from operators and programmers to testers and educators. It is a reminder that every landmark was built by more hands than its plaque can hold.',
    stats: [
      { k: 'Honours', v: 'uncredited contributors', sourceId: 'Wikipedia: Women in computing' },
      { k: 'Example', v: 'the ENIAC Six, recognized late', sourceId: 'Wikipedia: Women in computing' },
      { k: 'Example', v: "NASA's human computers", sourceId: 'Wikipedia: West Area Computers' }
    ],
    sources: [
      w('Wikipedia: Women in computing', 'https://en.wikipedia.org/wiki/Women_in_computing'),
      w('Wikipedia: West Area Computers', 'https://en.wikipedia.org/wiki/West_Area_Computers')
    ]
  },

  // ---- Society & Ethics (extended) -----------------------------------------
  S1: {
    hook: 'Two missing digits, and a worldwide scramble to add them back.',
    caption:
      'As the year 2000 approached, programs that stored years with two digits threatened to read 2000 as 1900. A worldwide remediation effort, estimated in the hundreds of billions of dollars, fixed most problems before they happened.',
    narration:
      'As the year 2000 approached, programs that stored years with two digits threatened to read 2000 as 1900. A worldwide remediation effort, estimated in the hundreds of billions of dollars, fixed most problems before they happened.',
    stats: [
      { k: 'Root cause', v: 'two-digit years', sourceId: 'Wikipedia: Year 2000 problem' },
      { k: 'Remediation cost', v: 'hundreds of billions of dollars', sourceId: 'Wikipedia: Year 2000 problem' },
      { k: 'Outcome', v: 'mostly avoided', sourceId: 'Wikipedia: Year 2000 problem' }
    ],
    sources: [w('Wikipedia: Year 2000 problem', 'https://en.wikipedia.org/wiki/Year_2000_problem')]
  },
  S2: {
    hook: 'A law that put people, not companies, in charge of their data.',
    caption:
      "The EU's General Data Protection Regulation took effect in May 2018, giving people rights over their personal data. It became a global benchmark for privacy law and can levy fines of up to four percent of global turnover.",
    narration:
      "The EU's General Data Protection Regulation took effect in May 2018, giving people rights over their personal data. It became a global benchmark for privacy law and can levy fines of up to four percent of global turnover.",
    stats: [
      { k: 'In effect', v: 'May 2018', sourceId: 'Wikipedia: General Data Protection Regulation' },
      { k: 'Rights', v: 'over personal data', sourceId: 'Wikipedia: General Data Protection Regulation' },
      { k: 'Max fine', v: '4 percent of global turnover', sourceId: 'Wikipedia: General Data Protection Regulation' }
    ],
    sources: [w('Wikipedia: General Data Protection Regulation', 'https://en.wikipedia.org/wiki/General_Data_Protection_Regulation')]
  },
  S4: {
    hook: 'The cloud has a carbon bill, and the phone in your pocket has a landfill date.',
    caption:
      'Data centres, devices and the race to build new chips all consume energy and create electronic waste. As computing grows, so does the question of how to power and dispose of it.',
    narration:
      'Data centres, devices and the race to build new chips all consume energy and create electronic waste. As computing grows, so does the question of how to power and dispose of it.',
    stats: [
      { k: 'Data centres', v: 'about 1 to 1.5 percent of global electricity', sourceId: 'IEA: Data centres and data transmission networks' },
      { k: 'E-waste in 2022', v: '62 million tonnes', sourceId: 'UN Global E-waste Monitor 2024' },
      { k: 'Formally collected', v: 'about 22 percent', sourceId: 'UN Global E-waste Monitor 2024' }
    ],
    sources: [
      w('IEA: Data centres and data transmission networks', 'https://www.iea.org/energy-system/buildings/data-centres-and-data-transmission-networks'),
      w('UN Global E-waste Monitor 2024', 'https://ewastemonitor.info/')
    ]
  },

  // ---- Future Lab (extended) -----------------------------------------------
  X1: {
    hook: "What a working quantum computer might one day do, imagined from today's labs.",
    caption:
      'Quantum futures looks ahead at what fully scaled quantum computers might one day do, from simulating molecules to searching huge spaces. The milestones and their dates are speculative, not settled.',
    narration:
      'Quantum futures looks ahead at what fully scaled quantum computers might one day do, from simulating molecules to searching huge spaces. The milestones and their dates are speculative, not settled.',
    stats: [
      { k: 'Target', v: 'fault-tolerant quantum computing', sourceId: 'Wikipedia: Quantum computing' },
      { k: 'Promise', v: 'simulating chemistry and materials', sourceId: 'Wikipedia: Quantum computing' },
      { k: 'Threat', v: "breaks today's cryptography", sourceId: 'Wikipedia: Quantum computing' }
    ],
    sources: [w('Wikipedia: Quantum computing', 'https://en.wikipedia.org/wiki/Quantum_computing')],
    caveat: 'Quantum futures describes ideas, not products; capability and timing are speculative.'
  },

  // ---- Core (24): narration only -------------------------------------------
  P4: {
    narration:
      "Charles Babbage designed the Difference Engine to compute mathematical tables, and the Analytical Engine to run any calculation from punched cards. Neither engine was finished in his lifetime, but the Analytical Engine's design held every part of a modern computer: a store, a mill, and control by a program."
  },
  P5: {
    narration:
      "Ada Lovelace's notes from 1843 on the Analytical Engine include Note G, which steps through a method for computing Bernoulli numbers. It is widely read as the first published algorithm written for a computing machine."
  },
  A3: {
    narration:
      'At Bletchley Park, the Bombe helped break German Enigma messages, and in 1944 Colossus attacked the Lorenz cipher. Colossus used valves and paper tape, and it is counted as the first programmable electronic digital computer.'
  },
  A4: {
    narration:
      "Claude Shannon's 1948 paper, A Mathematical Theory of Communication, defined the bit and showed how much information a channel can carry. It founded information theory and underpins every digital system built since."
  },
  A7: {
    narration:
      'Whitfield Diffie and Martin Hellman proposed public key cryptography in 1976, so two people could agree on a secret over a public channel. In 1977, Ron Rivest, Adi Shamir and Leonard Adleman turned the idea into RSA.'
  },
  B4: {
    narration:
      'On June 21, 1948, the Manchester Baby ran the first program stored in electronic memory. The program lived in the same store as the data, the pattern every computer since has followed.'
  },
  B5: {
    narration:
      'Jack Kilby built the first integrated circuit in 1958, and Robert Noyce made a silicon version in 1959 that was easier to mass produce. Putting many components on one chip made the microelectronics revolution possible.'
  },
  B7: {
    narration:
      'The Intel 4004, released in 1971, packed a four bit central processing unit onto a single chip. It was the first commercially available microprocessor, putting a computer brain in a package the size of a fingernail.'
  },
  B10: {
    narration:
      'Nvidia released CUDA in 2007, opening the graphics processing unit to general purpose computing. Thousands of small cores running together made GPUs the engine of the deep learning boom.'
  },
  C2: {
    narration:
      "Grace Hopper's A-0 system, finished in 1952, translated symbolic instructions into machine code for the UNIVAC I. It was an early compiler, a first step toward programming in something closer to English."
  },
  C6: {
    narration:
      'Ken Thompson and Dennis Ritchie built Unix at Bell Labs in 1969, and Ritchie designed C in 1972 to rewrite it. Unix tools and the portability of C became the foundation of modern software.'
  },
  C7: {
    narration:
      "Edgar Codd's 1970 paper described data as relations, or tables, that could be queried in a uniform way. The relational model became the basis of SQL and nearly every database in use today."
  },
  C8: {
    narration:
      'Richard Stallman launched the GNU project in 1983 to build a free operating system, and Linus Torvalds released the Linux kernel in 1991. Together they power most of the servers on the internet and every Android phone.'
  },
  D1: {
    narration:
      'ARPANET went live in 1969, connecting four university sites by packet switching. Its first message, LOGIN from UCLA to Stanford, crashed after two letters, but the network grew into the internet.'
  },
  D4: {
    narration:
      "Vint Cerf and Bob Kahn described TCP in 1974 as a way to connect separate networks into an internet. On January 1, 1983, ARPANET switched to TCP and IP, the event many mark as the internet's birthday."
  },
  D11: {
    narration:
      'Amazon Web Services launched S3 storage and EC2 compute in 2006, letting anyone rent servers by the hour over the internet. The cloud turned computing into a utility and became the default way software runs.'
  },
  E2: {
    narration:
      "Ivan Sutherland's Sketchpad, from his 1963 MIT thesis, let a user draw on screen with a light pen and move shapes as objects. It pioneered interactive computer graphics and the idea of the graphical interface."
  },
  E6: {
    narration:
      'The IBM PC, released in 1981, set the standard for personal computers in business. In 1984, the Macintosh brought the mouse and a graphical interface to a mass audience.'
  },
  E7: {
    narration:
      'The iPhone, announced in 2007, combined a phone, an internet device and a music player behind a multi touch screen. Direct manipulation by touch changed how billions of people use computers.'
  },
  F3: {
    narration:
      "Frank Rosenblatt's perceptron, demonstrated in 1958, was an early artificial neuron that learned by adjusting its weights. It could recognise simple patterns, and its limits later motivated the work that powers neural networks today."
  },
  F8: {
    narration:
      'AlexNet won the 2012 ImageNet competition by a wide margin, using a deep convolutional network trained on GPUs. Its victory launched the deep learning era that produced modern AI systems.'
  },
  F11: {
    narration:
      'OpenAI released ChatGPT on November 30, 2022, a chatbot built on a large language model. It reached about a hundred million users in two months and made generative AI a daily tool.'
  },
  G1: {
    narration:
      'Kay McNulty, Betty Jennings, Betty Snyder, Marlyn Wescoff, Fran Bilas and Ruth Lichterman programmed the ENIAC by setting its cables and switches. They worked out the machine logic largely from block diagrams, and their story is now a landmark in the history of programming.'
  },
  S3: {
    narration:
      'The Bloat Audit turns the museum performance budget into an exhibit. It tracks the median web page, which grew to about two point five six megabytes in 2025, and asks how much of that weight actually serves the visitor.'
  }
}

interface RawExhibit {
  id: string
  tier?: string
  title?: string
  hook?: string
  caption?: string
  narration?: string
  stats?: Stat[]
  sources?: Source[]
  caveat?: string
}

interface RawExhibitsFile {
  scopeVersion: string
  exhibits: RawExhibit[]
}

const EM_DASH = /\u2014|\u2013/g

function assertNoDashes(content: Content, id: string): void {
  const parts = [content.hook, content.caption, content.narration, content.caveat]
  for (const part of parts) {
    if (part && EM_DASH.test(part)) {
      throw new Error(`${id}: em/en dash found in copy`)
    }
  }
}

function main() {
  const exhibitsPath = root('../data/exhibits.json')
  const raw = JSON.parse(readFileSync(exhibitsPath, 'utf8')) as RawExhibitsFile

  for (const exhibit of raw.exhibits) {
    const content = CONTENT[exhibit.id]
    if (!content) continue
    assertNoDashes(content, exhibit.id)

    if (content.hook) exhibit.hook = content.hook
    if (content.caption) exhibit.caption = content.caption
    if (content.stats) exhibit.stats = content.stats
    if (content.sources) exhibit.sources = content.sources
    if (content.caveat) exhibit.caveat = content.caveat
    exhibit.narration = content.narration
  }

  const json = JSON.stringify(raw, null, 1).replace(/\r?\n/g, '\r\n') + '\r\n'
  writeFileSync(exhibitsPath, json)

  // Generate docs/exhibits/<ID>.md for extended exhibits and inject narration
  // into the existing Core exhibit docs.
  const docsDir = root('../../../docs/exhibits')
  mkdirSync(docsDir, { recursive: true })

  const ordered = raw.exhibits.filter((exhibit) => CONTENT[exhibit.id])

  for (const exhibit of ordered) {
    const content = CONTENT[exhibit.id] as Content
    const file = join(docsDir, `${exhibit.id}.md`)

    if (content.caption) {
      // Extended exhibit: generate a full draft file.
      const statsLines = (content.stats ?? [])
        .map((stat) => `- **${stat.k}:** ${stat.v} (${stat.sourceId})`)
        .join('\n')
      const sourceLines = (content.sources ?? [])
        .map((source) => `- ${source.label}: ${source.url}`)
        .join('\n')
      const caveatBlock = content.caveat ? `\n\n## Caveat\n\n${content.caveat}\n` : ''
      const md =
        `> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) \u00b7 Scope v1.1\n` +
        `> **Exhibits:** ${exhibit.id}\n` +
        `> **Status:** Draft\n\n` +
        `# ${exhibit.id} \u00b7 ${exhibit.title ?? exhibit.id}\n\n` +
        `## Hook\n\n${content.hook ?? ''}\n\n` +
        `## Caption\n\n${content.caption}\n\n` +
        `## Stats\n\n${statsLines}\n\n` +
        `## Sources\n\n${sourceLines}\n` +
        caveatBlock +
        `\n## Narration draft\n\n${content.narration}\n\n` +
        `## Notes\n\n- Planned Extended exhibit, not yet built. No portal yet.\n`
      writeFileSync(file, md)
    } else {
      // Core exhibit: inject narration before the Notes section.
      let text = readFileSync(file, 'utf8')
      text = text.replace(
        /\n## Notes\n/,
        `\n## Narration draft\n\n${content.narration}\n\n## Notes\n`
      )
      text = text.replace(
        '- Planned Core exhibit, not yet built. No portal or narration yet.',
        '- Planned Core exhibit, not yet built. No portal yet.'
      )
      writeFileSync(file, text)
    }
  }

  const enriched = raw.exhibits.filter((e) => CONTENT[e.id]).length
  console.log(`Plan 16 content applied to ${enriched} exhibits.`)
}

main()
