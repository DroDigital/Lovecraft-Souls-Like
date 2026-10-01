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
  // Round 13: the tomes in the dungeons' new rooms.
  'Liber Ivonis': tome(
    "The Latin Book of Eibon, a fifteenth-century copy chained to its shelf. The chain has been cut.",
    'A slip marks the chapter on Zhothaqquah, "who dwelleth in N\'kai beneath the mound". Someone has written in the margin: "the mound at Dunwich? or the one at Binger?"',
  ),
  "Gilman's Dream-Diary": tome(
    "A student's notebook, water-stained, found in a rat-hole. Walter Gilman's hand, getting worse page by page.",
    '"March 30. The little thing with the man\'s face came again last night. It nuzzled my hand. I am afraid of the angles of this room. I am more afraid of the day I stop being afraid of them."',
  ),
  "Old Whateley's Ledger": tome(
    'A farm account-book: cattle bought, cattle bought, cattle bought. Never a head sold.',
    'On the inside cover, in a different ink: "Enlarge the shed agin. He grows faster than they told. Yog-Sothoth is the gate. The boy must learn the words."',
  ),
  "Obed Marsh's Log": tome(
    "The captain's log of the Sumatra Queen, 1838 to 1846, swollen with seawater.",
    '"Walakea says they will give fish and gold for young folk. I told him Innsmouth has plenty of both kinds of young folk, and the ones that go down to them will not die, only change. Signed it at the reef tonight."',
  ),
  "Bowen's Journal": tome(
    'Professor Enoch Bowen, Providence, 1844, on his return from Egypt: a list of what he brought home in his crates.',
    '"The box with the stone. Keep it closed. The stone must not be left in darkness, and it must not be left in light. I have not decided which is worse."',
  ),
  "Danforth's Sketches": tome(
    "Pencil drawings from the Miskatonic Antarctic Expedition's second flight. The later sheets are not of buildings.",
    'The last sketch is of a black, bubbling mass filling a tunnel from wall to wall, lit by the plane\'s lamp. Written under it, over and over: "Tekeli-li. Tekeli-li."',
  ),
  'The Case of the Earth Race': tome(
    'Metal-bound pages in a script like hooked marks, and, pressed between them, a sheet of University letterhead.',
    'Peaslee\'s hand: "It is my own writing. I wrote this, in their script, in 1908 to 1913, in a body that was not mine. I have now seen the shelf it was kept on. I wish I had not."',
  ),
  "Zamacona's Manuscript": tome(
    "A roll of parchment in sixteenth-century Spanish, found in a clay cylinder. Pánfilo de Zamacona y Nuñez's account of K'n-yan.",
    '"They have given up the gods of the upper world, and even Yig and Tulu they keep only as a habit. But of what lies beneath red-litten Yoth, in black N\'kai, they will not speak at all."',
  ),
  'The Pnakotic Fragments': tome(
    "Loose leaves the elder priests of Ulthar keep behind a grille. They are older than Ulthar.",
    '"Seek not Kadath, for the gods of earth are weak, and dwell there under the guard of the Other Gods from outside, whose soul and messenger is the crawling chaos Nyarlathotep."',
  ),
  "Johansen's Narrative": tome(
    'The Norwegian mate\'s account of the Emma and the Alert, the copy his widow sent to Professor Angell.',
    '"The angles were all wrong. A man went in over a corner that was not there, and did not come out. Then the great door opened, and It came out, and I steered for It."',
  ),
  "The Outer Ones' Ledger": tome(
    'A list scratched on a thin sheet of some metal that is not any metal, in English, in a hand that tried hard to be human.',
    '"Received for the journey: one brain, H.W.A., in cylinder 12. Condition good. He asks for his son. We have told him the son will come."',
  ),
  "The Silver Key's Inscription": tome(
    'Nine lines in no known alphabet, rubbed from the key itself onto a sheet of paper by someone who could not read them either.',
    'Beneath, in pencil: "Randolph Carter turned it at the Snake Den on his fifty-fourth birthday. He was never found. He was never quite lost either."',
  ),
  "St John's Diary": tome(
    'A pocket diary with a green jade amulet pressed into its last pages, so that the shape of it stays in the paper.',
    '"We should never have opened that grave in Holland. The baying follows us across the moor now. St John says it is only a dog. There are no dogs within ten miles."',
  ),
  "Asenath's Notes": tome(
    "Loose sheets in a heavy, forceful hand that does not match the woman's signature at the bottom.",
    '"The body is young but it is a woman\'s, and a woman cannot enter the Order\'s inner circle. Edward Derby is weak. Edward Derby will do."',
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
  // Round 34: the far realms had no notes in the open (six of the thirteen); each now has two, and the sparest near ones another.
  "Lake's Notebook": note(
    "A field notebook with a split spine, the last page in pencil: \"Specimen 4 is warm to the touch. Dissected the third. Nobody has lit the stove since the dogs began. Gedney says the sixth is no longer on the table.\"",
    "Under it, in a steadier hand, Danforth's: \"We found eight of them afterwards, set upright in the snow, each in a perfect five-pointed mound. Whoever buried them had a great deal of respect for the dead.\"",
  ),
  "A Sledge Driver's Note": note(
    "Dogs will not go past the ridge. Not for the whip, not for fish. Pierce says it is the wind. I say the wind never played a tune before.",
    'Someone has added in a thick pencil: "It has a very wide range, the tune. I counted the notes from a sledge and I could not count them all."',
  ),
  "Freeborn's Survey Book": note(
    "Western Australia, 1935. Block 17: basalt, cyclopean, not cut but ground. The sand has been blown off it more than once; the drift shows two kinds of wind. Mackenzie wants to dig. I would rather not.",
    'On the facing page, in another hand: "Peaslee dreamed of this place for fifteen years before he saw it. At the fork he knew which way the stairs went, and said so, and then asked us to forget he had."',
  ),
  "A Receipt in the Archivist's Hand": note(
    'Received for the Great Race: one mind of the dominant form of the third planet, 1.7 of its years, held for the study of its age. Returned with most of its memory, as agreed. The borrowed body is marked in good condition.',
    "A line is added in English, a good deal more slowly written: \"The borrower asks it be noted that the exchange student wept at the end of the term, and did not say for what.\"",
  ),
  "A Judge's Notice": note(
    "NOTICE OF THE THIRD HALL. The sitting is adjourned for want of a god. The Judge records that Tulu is again the fashion and the old Serpent unfashionable, and reminds the citizens that the Serpent is unfashionable at its pleasure.",
    'Below, in a sharper script: "Citizens are asked to leave the lower stair clear. What is kept beneath red Yoth is not our concern, and we would like it to remain so."',
  ),
  'Tally of the Red Stairs': note(
    "Nine steps to red-litten Yoth. The light is warm to the sixth and begins to fail at the seventh. It does not fail further, for what lies below it is not dark, being the absence of any light and so beyond the reach of its dimming.",
    'A child has scratched a little figure with six arms beside the ninth step, and the words: "He waves."',
  ),
  "A Cultist's Chalk": note(
    "Chalked on a slab, rubbed out, and chalked again, each time a little nearer the sounds: Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn.",
    'A pencil has been taken to the margin: "The man who wrote this could not say it. He said it nonetheless, and the island came up to hear."',
  ),
  'Notice to Mariners': note(
    'HYDROGRAPHIC OFFICE. A new island, pale and uncharted, is reported in the southern Pacific, with a door in it. Vessels are advised to give it a wide berth. This notice has been withdrawn.',
    'Withdrawn, a clerk has written beneath, "at the request of a gentleman from the Department who did not give his name, and who did not leave footprints on the stair."',
  ),
  'A Surgical Chart': note(
    'A sheet of thin metal, flayed rather than cut, marked with a diagram of a human head in section. The brain is outlined in red and the line of the incision in green. The legend is in English.',
    '"Transit time: forty minutes. The patient will not feel the cold. The patient will be asked, on waking, whether it would like to see the Earth from here; it generally would."',
  ),
  'Cylinder Labels': note(
    'A strip of labels, peeled from a long row of metal cases: "H.W.A.", "L. Frodsham, chemist, 1801", "A miner out of Sweden, name not offered", "Madame Z., of the second boat".',
    'The last label has been left blank, and a mark in the same metal beside it says, in English, that it is not to be opened until it asks.',
  ),
  "Erich Zann's Score": note(
    'Eight pages of viol music in a cramped hand, the bars all wrong in the way a language is wrong. No fingers could play them; a man might almost whistle them, with his breath held.',
    'The last page stops in the middle of a bar, with a long smear where a bow was dropped, and a note in the margin: "Do not stop. Whatever you do, do not stop."',
  ),
  "Carter's Pocket Notebook": note(
    'A leather notebook with a Boston stationer\'s mark. The last entry reads: "Went beyond the last gate with the Key. The Guide says one does not walk here; one is agreed upon."',
    '"Left the lantern behind, since there is nothing here to light. I find I do not miss it. This worries me a great deal less than it ought."',
  ),
  "Ward's Last Letter": note(
    'To Dr. Willett. "I have been foolish, and I am afraid I cannot be undone by being sorry. You will find me, if you look, at the farm in Pawtuxet. Do not go down the stair alone."',
    'The ink changes halfway down the page from blue to black, and the hand from a young man\'s to something steadier and older. The last line is a postscript: "He has read this over my shoulder. He sends his regards."',
  ),
  "Rev. Hoag's Sermon Notes": note(
    'Sermon for the Sunday after the Round Hills groaned: "The Devil is not far from any of us. He is nearer than the hills, and fonder of the Whateleys than the church ever was."',
    'The sexton has noted in the margin that only six of the congregation stayed to the end, and that the bell rang twice by itself during the benediction.',
  ),
  "Wilmarth's Telegram": note(
    'TOWNSHEND VT. AKELEY HAS CHANGED HIS MIND ABOUT EVERYTHING STOP DO NOT BRING THE PHOTOGRAPHS STOP BRING INSTEAD THE PHONOGRAPH RECORD STOP WILL EXPLAIN STOP',
    'In the margin of the form, in Wilmarth\'s hand: "He never changed his mind about anything in his life. The man who sent this is very pleased with himself."',
  ),
  "The Zoogs' Warning": note(
    'Chalked on a stone in a wood where the stones are all friendly: do not eat the mushrooms that glow; do not follow the lights; do not tell the cats where we have been.',
    'Underneath, a smudged paw-print, and, much larger, something that is not a paw-print at all, which the zoogs have drawn a circle around and left alone.',
  ),
};

/** The notes' places, by region (metres from the region's south-west corner, like sites.ts). */
export const NOTE_SITES: Readonly<Record<string, readonly (readonly [name: string, x: number, z: number])[]>> = {
  hub: [['Arkham Advertiser, October 2nd', 244, 232], ["Frank's Letter Home", 92, 446]],
  arkham: [["Officer Riley's Report", 436, 270], ["Ammi Pierce's Letter", 228, 170]],
  providence: [['Postcard from Kingsport', 444, 134], ["Ward's Last Letter", 104, 286]],
  dunwich: [["Sheriff's Notebook", 452, 72], ["Rev. Hoag's Sermon Notes", 410, 96]],
  innsmouth: [['Railway Notice', 94, 92], ['Treasury Memorandum', 436, 238]],
  vermont: [["Akeley's Last Letter", 270, 60], ["Wilmarth's Telegram", 290, 96]],
  dreamlands: [['Ordinance of Ulthar', 340, 158], ["The Zoogs' Warning", 300, 168]],
  mountains: [["Lake's Notebook", 294, 86], ["A Sledge Driver's Note", 214, 100]],
  pnakotus: [["Freeborn's Survey Book", 404, 114], ["A Receipt in the Archivist's Hand", 466, 118]],
  kn_yan: [["A Judge's Notice", 292, 94], ['Tally of the Red Stairs', 138, 362]],
  rlyeh: [["A Cultist's Chalk", 128, 88], ['Notice to Mariners', 318, 172]],
  yuggoth: [['A Surgical Chart', 98, 282], ['Cylinder Labels', 300, 254]],
  beyond: [["Carter's Pocket Notebook", 224, 78], ["Erich Zann's Score", 120, 242]],
};
