/**
 * What the investigator reads (playtest round 1): each tome's text, and the field notes left about
 * the world — clippings, letters, reports. Plain prose, as the people who wrote them would have
 * written it. Keyed by the name a tome or note is placed under (sites.ts, dungeons.ts, lairs.ts).
 */

export interface Document {
  kind: 'tome' | 'note';
  text: readonly string[]; // paragraphs
}

const tome = (...text: string[]): Document => ({ kind: 'tome', text });
const note = (...text: string[]): Document => ({ kind: 'note', text });

export const DOCUMENTS: Readonly<Record<string, Document>> = {
  Necronomicon: tome(
    "The Latin of Olaus Wormius, the 1623 printing: the university's own copy. Someone has been reading it with a pencil in hand.",
    "In the margin beside the passage on the Gate, in Peaslee's small, neat writing: \"Y. is the gate and the key and the guardian. Then who holds the key now? Ask A. about Carter.\" The last line is underlined twice.",
  ),
  "Keziah's Formulae": tome(
    'Loose sheets in a woman\'s hand, very old, the ink gone brown. Most of it is arithmetic. Some of the figures describe angles that add up to more than a corner should.',
    'On the last sheet, in a much newer hand: "It works. God help me, it works. W.G."',
  ),
  "Curwen's Journal": tome(
    'Joseph Curwen\'s hand, dated 1754: "Rec\'d this day from H. the Essential Saltes of one I had long sought. Must be carefull in the words. Never call up any that you can not put downe."',
    'Below it, in modern pencil: "He did not listen to himself either. M.B.W."',
  ),
  "Akeley's Phonograph Record": tome(
    'A wax cylinder in a cardboard sleeve, labelled "May Eve 1915, Dark Mountain". You do not need a machine to hear it. It plays in your head as you hold it.',
    'A man\'s voice reads a kind of service. A buzzing answers him, trying hard to sound like speech. It says: "To Nyarlathotep, Mighty Messenger, must all things be told."',
  ),
  'Elder Thing Murals': tome(
    'A photograph of a carved wall, drawn over in pencil to bring out the lines. Star-shaped figures build a city. Then black, shapeless things do the building for them. Then the black things pull the builders apart.',
    'Written underneath: "Shoggoths. Their own servants. Do not go further in. W.D."',
  ),
  'Pnakotic Manuscripts': tome(
    'Fragments of something older than writing, copied into English by a careful hand: "The Great Race sends its minds across time and takes the bodies of others for a while, to study their age. The borrowed ones remember nothing afterwards but dreams of a library."',
    'A note at the foot of the page: "This is what happened to my father in 1908. I am sure of it now. W.P."',
  ),
  "R'lyehian Tablet": tome(
    'A greenish stone tablet, cold and slightly greasy. The characters are no alphabet you know, but you can read them, which is worse.',
    'They say the same thing over and over: that in his house at R\'lyeh the dead one waits, dreaming. Every sleeper in Arkham is dreaming too. You wonder whose dream this is.',
  ),
  "Michel Mauvais's Notes": tome(
    'Notes in old French with a later owner\'s translation in the margin. The wizard Michel Mauvais was burned by the Count de C—, and his son swore that no heir of the Count would live past thirty-two.',
    '"The curse is carried out by the son himself," the translator writes, "who has kept alive six hundred years by an elixir. The heirs never guessed who he was."',
  ),
  "Carter's Account": tome(
    'Pages in Randolph Carter\'s hand, from his years in Arkham. "I told Manton there was nothing unnamable. I was wrong."',
    'Between the pages, a newer card: "R. Carter, 2 Parker Place, Arkham." On the back, in pencil: "He asked for the key very politely. I said no. He will come back."',
  ),
  "Suydam's Papers": tome(
    "Robert Suydam's papers, water-stained. Lists of names and addresses in Red Hook, most of them crossed out. The draft of a wedding announcement.",
    'At the bottom of the last page: "The tall gentleman says the gate will be open by the autumn, and I may bring my bride through."',
  ),
  'Cultes des Goules': tome(
    "The Comte d'Erlette's book on the ghoul cults of France, in a cheap later printing. A railway ticket marks the chapter on New England. The name on the ticket is Pickman.",
    'The chapter says the ghouls were men once, and still keep some of the habits of men, including a taste for good paintings.',
  ),
  'Unaussprechlichen Kulten': tome(
    "Von Junzt's Nameless Cults, the Düsseldorf edition of 1839, with the iron clasps. The page on the Black Goat of the Woods has been folded down.",
    'Beside it, in a farmer\'s big letters: "Wizard W. read this out loud on the hill every May Eve and Lammas. That is when the noises started."',
  ),
  'Seven Cryptical Books of Hsan': tome(
    'A book of dream-lore from Ulthar, the pages brown and soft: "The gods of earth dwell upon Kadath in the cold waste. They are weak and mild, and they are watched by the Other Gods from outside, whose messenger is the crawling chaos."',
    'Someone has pressed a flower between these pages. It is still fresh.',
  ),

  'Arkham Advertiser, October 2nd': note(
    'SLEEPING SICKNESS AT UNIVERSITY. Professor Wingate Peaslee of the Department of Psychology was found asleep at a table in the Orne Library on Monday morning and has not woken.',
    'Dr. Hartwell of St. Mary\'s Hospital calls the professor\'s condition "unusual but not alarming". Four more cases have been reported in Arkham since.',
  ),
  "Frank's Letter Home": note(
    "Dear Mother, don't worry about the news, they say it isn't catching. Everyone here is on edge though. Old Armitage has had the restricted room locked, and he sleeps in the library himself now, on a cot.",
    'Last night I walked past at midnight and saw him standing at the window, looking out at the quad as if he was waiting for somebody. Your loving son, Frank.',
  ),
  "Officer Riley's Report": note(
    'Report of Officer D. Riley, Arkham Police, October 3rd. Called to the Witch House regarding noises. Found the upper floor empty.',
    'In the attic room there is a hole where the ceiling meets the wall. I could not see the end of it with my torch. Small footprints in the dust, like a rat\'s, but with fingers. I recommend the house be boarded up.',
  ),
  "Ammi Pierce's Letter": note(
    "They're building the new reservoir over the old Gardner place, and I say good riddance. Don't you drink the water up there when it's done.",
    "Something came down in the Gardners' well in '82 and it never went away. It just changed colour. Your loving father, Ammi.",
  ),
  'Postcard from Kingsport': note(
    "Don't come up here, Ellie. There's an old man on Water Street who keeps bottles on a shelf and talks to them, and they swing without any wind.",
    'Three sailors went to rob him last week. Nobody has seen them since. T.',
  ),
  "Sheriff's Notebook": note(
    "Aylesbury Pike, Sept. 9. Seth Bishop's cattle gone, eleven head. No tracks, but a trail flattened through the brush as if somebody had dragged a barn along it.",
    'Whateley farm boarded up since the boy died. Whippoorwills very loud. Selina Frye says they are waiting to catch a soul.',
  ),
  'Railway Notice': note(
    'NOTICE. Owing to lack of custom, the Arkham to Innsmouth branch line is suspended until further notice.',
    "Travellers to Innsmouth should use Joe Sargent's bus from Newburyport. The company takes no responsibility for delays on the Innsmouth road.",
  ),
  'Treasury Memorandum': note(
    'Confidential. February 1928 raid on Innsmouth: two hundred persons removed to camps. A submarine was sent out to Devil Reef. The crew\'s report is withheld.',
    'Several of the removed persons have since died in custody of what the camp doctor calls "a change in the skin".',
  ),
  "Akeley's Last Letter": note(
    'Townshend, Vermont. Dear Mr. Wilmarth, I have been out on the hills again and there are more tracks than ever, all of them pointing toward my house.',
    'They have been leaving my dogs alone, which worries me more than if they had not. If I stop writing, do not come up here. Yours, Henry W. Akeley.',
  ),
  'Ordinance of Ulthar': note(
    'It is the law in Ulthar that no man may kill a cat. It has been the law since the old cottager and his wife were found with their bones picked clean, the morning after the caravan left.',
    'A merchant who laughed at the law last spring left town in a hurry. His mule came back without him.',
  ),
};

/** The notes' places, by region (metres from the region's south-west corner, like sites.ts). */
export const NOTE_SITES: Readonly<Record<string, readonly (readonly [name: string, x: number, z: number])[]>> = {
  hub: [['Arkham Advertiser, October 2nd', 244, 232], ["Frank's Letter Home", 92, 446]],
  arkham: [["Officer Riley's Report", 436, 270], ["Ammi Pierce's Letter", 228, 170]],
  providence: [['Postcard from Kingsport', 444, 134]],
  dunwich: [["Sheriff's Notebook", 452, 72]],
  innsmouth: [['Railway Notice', 94, 92], ['Treasury Memorandum', 436, 238]],
  vermont: [["Akeley's Last Letter", 270, 60]],
  dreamlands: [['Ordinance of Ulthar', 340, 158]],
};
