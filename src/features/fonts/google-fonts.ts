/**
 * Google Fonts 的内置字体清单（构建期生成，运行时不依赖任何接口与 key）。
 *
 * 数据来源：`https://fonts.google.com/metadata/fonts` —— Google Fonts 官网自己用的公开
 * 清单，无需 API key。只保留带 `latin` 子集的族：中文 / 日文 / 韩文族在 CSS API 上会被
 * 拆成上百个 `unicode-range` 子集，用「自定义导入」更合适，列在这里只会让人点了「引入」
 * 才失败。重新生成见 docs/03 的「Google Fonts 清单」小节。
 */

const CATEGORY_LABELS: Record<string, string> = {
  S: '无衬线',
  F: '衬线',
  D: '展示',
  H: '手写',
  M: '等宽',
};

const RAW = `ABeeZee|S
Abel|S
Abhaya Libre|F
Aboreto|D
Abril Fatface|D
Abyssinica SIL|F
Aclonica|S
Acme|S
Actor|S
Adamina|F
ADLaM Display|D
Advent Pro|S
Afacad|S
Afacad Flux|S
Agbalumo|D
Agdasima|S
Agu Display|D
Aguafina Script|H
Akatab|S
Akaya Kanadaka|D
Akaya Telivigala|D
Akronim|D
Akshar|S
Akt|S
Aladin|D
Alan Sans|S
Alata|S
Alatsi|S
Albert Sans|S
Aldrich|S
Alef|S
Alegreya|F
Alegreya Sans|S
Alegreya Sans SC|S
Alegreya SC|F
Aleo|F
Alex Brush|H
Alexandria|S
Alfa Slab One|D
Alice|F
Alien Block|D
Alike|F
Alike Angular|F
Alkalami|F
Alkatra|D
Allan|D
Allerta|S
Allerta Stencil|S
Allison|H
Allura|H
Almarai|S
Almendra|F
Almendra Display|D
Almendra SC|F
Alumni Sans|S
Alumni Sans Collegiate One|S
Alumni Sans Inline One|D
Alumni Sans Pinstripe|S
Alumni Sans SC|S
Alyamama|F
Amarante|D
Amaranth|S
Amarna|S
Amatic SC|H
Amethysta|F
Amiko|S
Amiri|F
Amiri Quran|F
Amita|H
Anaheim|S
Ancizar Sans|S
Ancizar Serif|F
Andada Pro|F
Andika|S
Anek Bangla|S
Anek Devanagari|S
Anek Gujarati|S
Anek Gurmukhi|S
Anek Kannada|S
Anek Latin|S
Anek Malayalam|S
Anek Odia|S
Anek Tamil|S
Anek Telugu|S
Angkor|D
Annapurna SIL|F
Annie Use Your Telescope|H
Anonymous Pro|M
Anta|S
Antic|S
Antic Didone|F
Antic Slab|F
Anton|S
Anton SC|S
Antonio|S
Anuphan|S
Anybody|D
Aoboshi One|F
AR One Sans|S
Arapey|F
Arbutus|F
Arbutus Slab|F
Architects Daughter|H
Archivo|S
Archivo Black|S
Archivo Narrow|S
Are You Serious|H
Aref Ruqaa|F
Aref Ruqaa Ink|F
Arima|D
Arimo|S
Arizonia|H
Armata|S
Arsenal|S
Arsenal SC|S
Artifika|F
Arvo|F
Arya|S
Asap|S
Asap Condensed|S
Asap Sharp|S
Asar|F
Asimovian|S
Asset|D
Assistant|S
Asta Sans|S
Astloch|D
Asul|F
Athiti|S
Atkinson Hyperlegible|S
Atkinson Hyperlegible Mono|S
Atkinson Hyperlegible Next|S
Atma|D
Atomic Age|D
Aubrey|D
Audiowide|D
Autour One|D
Average|F
Average Sans|S
Averia Gruesa Libre|D
Averia Libre|D
Averia Sans Libre|D
Averia Serif Libre|D
Azeret Mono|M
B612|S
B612 Mono|M
Babylonica|H
Bacasime Antique|F
Bad Script|H
Badeen Display|D
Bagel Fat One|D
Bahiana|D
Bahianita|D
Bai Jamjuree|S
Bakbak One|D
Ballet|H
Baloo 2|D
Baloo Bhai 2|D
Baloo Bhaijaan 2|D
Baloo Bhaina 2|D
Baloo Chettan 2|D
Baloo Da 2|D
Baloo Paaji 2|D
Baloo Tamma 2|D
Baloo Tammudu 2|D
Baloo Thambi 2|D
Balsamiq Sans|D
Balthazar|F
Bangers|D
Barlow|S
Barlow Condensed|S
Barlow Semi Condensed|S
Barriecito|D
Barrio|D
Basic|S
Baskervville|F
Baskervville SC|F
Battambang|D
Baumans|D
Bayon|S
BBH Bartle|S
BBH Bogle|S
BBH Hegarty|S
Be Vietnam Pro|S
Beau Rivage|H
Bebas Neue|S
Beiruti|S
Belanosima|S
Belgrano|F
Bellefair|F
Belleza|S
Bellota|D
Bellota Text|D
BenchNine|S
Benne|F
Bentham|F
Berkshire Swash|H
Besley|F
Betania Patmos|H
Betania Patmos GDL|H
Betania Patmos In|H
Betania Patmos In GDL|H
Beth Ellen|H
Bevan|F
BhuTuka Expanded One|F
Big Shoulders|D
Big Shoulders Inline|D
Big Shoulders Stencil|D
Bigelow Rules|D
Bigshot One|D
Bilbo|H
Bilbo Swash Caps|H
BioRhyme|F
BioRhyme Expanded|F
Birthstone|H
Birthstone Bounce|H
Biryani|S
Bitcount|D
Bitcount Grid Double|D
Bitcount Grid Double Ink|D
Bitcount Grid Single|D
Bitcount Grid Single Ink|D
Bitcount Ink|D
Bitcount Prop Double|D
Bitcount Prop Double Ink|D
Bitcount Prop Single|D
Bitcount Prop Single Ink|D
Bitcount Single|D
Bitcount Single Ink|D
Bitter|F
BIZ UDGothic|S
BIZ UDMincho|F
BIZ UDPGothic|S
BIZ UDPMincho|F
BJCree|F
Black And White Picture|D
Black Han Sans|S
Black Ops One|D
Blaka|D
Blaka Hollow|D
Blaka Ink|D
Blinker|S
Bodoni Moda|F
Bodoni Moda SC|F
Bokor|D
Boldonse|D
Bona Nova|F
Bona Nova SC|F
Bonbon|H
Bonheur Royale|H
Boogaloo|D
Borel|H
Bowlby One|D
Bowlby One SC|D
Bpmf Huninn|S
Bpmf Iansui|H
Bpmf Zihi Kai Std|S
Braah One|S
Brawler|F
Bree Serif|F
Bricolage Grotesque|S
Bruno Ace|D
Bruno Ace SC|D
Brygada 1918|F
Bubblegum Sans|D
Bubbler One|S
Buda|D
Buenard|F
Bungee|D
Bungee Hairline|D
Bungee Inline|D
Bungee Outline|D
Bungee Shade|D
Bungee Spice|D
Bungee Tint|D
Butcherman|D
Butterfly Kids|H
Bytesized|S
Caacupe One|D
Cabin|S
Cabin Condensed|S
Cabin Sketch|D
Cactus Classical Serif|F
Caesar Dressing|D
Cagliostro|S
Cairo|S
Cairo Play|S
Cal Sans|S
Caladea|F
Calistoga|D
Calligraffitti|H
Cambay|S
Cambo|F
Candal|S
Cantarell|S
Cantata One|F
Cantora One|S
Caprasimo|D
Capriola|S
Caramel|H
Carattere|H
Cardo|F
Carlito|S
Carme|S
Carrois Gothic|S
Carrois Gothic SC|S
Carter One|D
Cascadia Code|S
Cascadia Mono|S
Castoro|F
Castoro Titling|D
Catamaran|S
Caudex|F
Cause|H
Caveat|H
Caveat Brush|H
Cedarville Cursive|H
Ceviche One|D
Chakra Petch|S
Changa|S
Changa One|D
Chango|D
Charis SIL|F
Charm|H
Charmonman|H
Chathura|S
Chau Philomene One|S
Chela One|D
Chelsea Market|D
Cherish|H
Cherry Bomb One|D
Cherry Cream Soda|D
Cherry Swash|D
Chewy|D
Chicle|D
Chilanka|H
Chiron GoRound TC|S
Chiron Hei HK|S
Chiron Sung HK|F
Chivo|S
Chivo Mono|M
Chocolate Classical Sans|S
Chokokutai|D
Chonburi|D
Cinzel|F
Cinzel Decorative|D
Clarity City|S
Clicker Script|H
Climate Crisis|D
Coda|D
Codystar|D
Coiny|D
Combo|D
Comfortaa|D
Comforter|H
Comforter Brush|H
Comic Neue|H
Comic Relief|D
Coming Soon|H
Comme|S
Commissioner|S
Concert One|D
Condiment|H
Contrail One|D
Convergence|S
Cookie|H
Copse|F
Coral Pixels|D
Corben|D
Corinthia|H
Cormorant|F
Cormorant Garamond|F
Cormorant Infant|F
Cormorant SC|F
Cormorant Unicase|F
Cormorant Upright|F
Cossette Texte|S
Cossette Titre|S
Courgette|H
Courier Prime|M
Cousine|M
Coustard|F
Covered By Your Grace|H
Crafty Girls|H
Creepster|D
Crete Round|F
Crimson Pro|F
Crimson Text|F
Croissant One|D
Crushed|D
Cuprum|S
Cute Font|D
Cutive|F
Cutive Mono|M
Dai Banna SIL|F
Damion|H
Dancing Script|H
Danfo|F
Dangrek|D
Darker Grotesque|S
Darumadrop One|D
Datatype|M
David Libre|F
Dawning of a New Day|H
Days One|S
Dekko|H
Dela Gothic One|D
Delicious Handrawn|H
Delius|H
Delius Swash Caps|H
Delius Unicase|H
Della Respira|F
Denk One|S
Devonshire|H
Dhurjati|S
Didact Gothic|S
Diphylleia|F
Diplomata|D
Diplomata SC|D
DM Mono|M
DM Sans|S
DM Serif Display|F
DM Serif Text|F
Do Hyeon|S
Dokdo|D
Domine|F
Donegal One|F
Dongle|S
Doppio One|S
Dorsa|S
Dosis|S
DotGothic16|S
Doto|S
Dr Sugiyama|H
Duru Sans|S
Dynalight|D
DynaPuff|D
Eagle Lake|H
East Sea Dokdo|H
Eater|D
EB Garamond|F
Economica|S
Eczar|F
Edu AU VIC WA NT Arrows|H
Edu AU VIC WA NT Dots|H
Edu AU VIC WA NT Guides|H
Edu AU VIC WA NT Hand|H
Edu AU VIC WA NT Pre|H
Edu NSW ACT Cursive|H
Edu NSW ACT Foundation|H
Edu NSW ACT Hand Pre|H
Edu QLD Beginner|H
Edu QLD Hand|H
Edu SA Beginner|H
Edu SA Hand|H
Edu TAS Beginner|H
Edu VIC WA NT Beginner|H
Edu VIC WA NT Hand|H
Edu VIC WA NT Hand Pre|H
El Messiri|S
Electrolize|S
Elms Sans|S
Elsie|D
Elsie Swash Caps|D
Emblema One|D
Emilys Candy|D
Encode Sans|S
Encode Sans Condensed|S
Encode Sans Expanded|S
Encode Sans SC|S
Encode Sans Semi Condensed|S
Encode Sans Semi Expanded|S
Engagement|H
Englebert|S
Enriqueta|F
Ephesis|H
Epilogue|S
Epunda Sans|S
Epunda Slab|F
Erica One|D
Esteban|F
Estedad|S
Estonia|H
Euphoria Script|H
Ewert|D
Exile|D
Exo|S
Exo 2|S
Expletus Sans|D
Explora|H
Faculty Glyphic|S
Fahkwang|S
Familjen Grotesk|S
Fanwood Text|F
Farro|S
Farsan|D
Fascinate|D
Fascinate Inline|D
Faster One|D
Fasthand|D
Fauna One|F
Faustina|F
Federant|D
Federo|S
Felipa|H
Fenix|F
Festive|H
Figtree|S
Finger Paint|D
Finlandica Headline|S
Finlandica Text|S
Fira Code|M
Fira Mono|M
Fira Sans|S
Fira Sans Condensed|S
Fira Sans Extra Condensed|S
Fjalla One|S
Fjord One|F
Flamenco|D
Flavors|D
Fleur De Leah|H
Flow Block|D
Flow Circular|D
Flow Rounded|D
Foldit|D
Fondamento|H
Fontdiner Swanky|D
Forum|D
Fragment Mono|M
Francois One|S
Frank Ruhl Libre|F
Fraunces|F
Freckle Face|D
Fredericka the Great|D
Fredoka|S
Freehand|D
Freeman|D
Fresca|S
Frijole|D
Fruktur|D
Fugaz One|D
Fuggles|H
Funnel Display|D
Funnel Sans|S
Fustat|S
Fuzzy Bubbles|H
Ga Maamli|D
Gabarito|D
Gabriela|F
Gaegu|H
Gafata|S
Gajraj One|D
Galada|D
Galdeano|S
Galindo|D
Gamja Flower|H
Gantari|S
Gasoek One|S
Gayathri|S
Geist|S
Geist Mono|M
Geist Pixel|D
Gelasio|F
Gemunu Libre|S
Genos|S
Gentium Book Plus|F
Gentium Plus|F
Geo|S
Geologica|S
Geom|S
Geomini|S
Georama|S
Geostar|D
Geostar Fill|D
Germania One|D
GFS Didot|F
GFS Neohellenic|S
Gideon Roman|D
Gidole|S
Gidugu|S
Gilda Display|F
Girassol|D
Give You Glory|H
Glass Antiqua|D
Glegoo|F
Gloock|F
Gloria Hallelujah|H
Glory|S
Gluten|D
Goblin One|D
Gochi Hand|H
Goldman|D
Golos Text|S
Google Sans|S
Google Sans Code|M
Google Sans Flex|S
Gorditas|D
Gothic A1|S
Gotu|S
Goudy Bookletter 1911|F
Gowun Batang|F
Gowun Dodum|S
Graduate|F
Grand Hotel|H
Grandiflora One|F
Grandstander|D
Grape Nuts|H
Gravitas One|D
Great Vibes|H
Grechen Fuemen|H
Grenze|F
Grenze Gotisch|D
Grey Qo|H
Griffy|D
Gruppo|S
Gudea|S
Gugi|D
Gulzar|F
Gupter|F
Gurajada|S
Gveret Levin|H
Gwendolyn|H
Habibi|F
Hachi Maru Pop|H
Hahmlet|F
Halant|F
Hammersmith One|S
Hanalei|D
Hanalei Fill|D
Handjet|D
Handlee|H
Hanken Grotesk|S
Hanuman|F
Happy Monkey|D
Harmattan|S
Headland One|F
Hedvig Letters Sans|S
Hedvig Letters Serif|F
Heebo|S
Henny Penny|D
Hepta Slab|F
Herr Von Muellerhoff|H
Hi Melody|H
Hibur Mono|M
Hina Mincho|F
Hind|S
Hind Guntur|S
Hind Madurai|S
Hind Mysuru|S
Hind Siliguri|S
Hind Vadodara|S
Holtwood One SC|F
Homemade Apple|H
Homenaje|S
Honk|D
Host Grotesk|S
Hubballi|S
Hubot Sans|S
Huninn|S
Hurricane|H
Iansui|H
Ibarra Real Nova|F
IBM Plex Mono|M
IBM Plex Sans|S
IBM Plex Sans Arabic|S
IBM Plex Sans Condensed|S
IBM Plex Sans Devanagari|S
IBM Plex Sans Hebrew|S
IBM Plex Sans JP|S
IBM Plex Sans KR|S
IBM Plex Sans Thai|S
IBM Plex Sans Thai Looped|S
IBM Plex Serif|F
Iceberg|D
Iceland|D
Idiqlat|F
IM Fell Double Pica|F
IM Fell Double Pica SC|F
IM Fell DW Pica|F
IM Fell DW Pica SC|F
IM Fell English|F
IM Fell English SC|F
IM Fell French Canon|F
IM Fell French Canon SC|F
IM Fell Great Primer|F
IM Fell Great Primer SC|F
Imbue|F
Imperial Script|H
Imprima|S
Inclusive Sans|S
Inconsolata|M
Inder|S
Indie Flower|H
Ingrid Darling|H
Inika|F
Inknut Antiqua|F
Inria Sans|S
Inria Serif|F
Inspiration|H
Instrument Sans|S
Instrument Serif|F
Intel One Mono|M
Inter|S
Inter Tight|S
Iosevka Charon|M
Iosevka Charon Mono|M
Irish Grover|D
Island Moments|H
Isometra|F
Istok Web|S
Italiana|S
Italianno|H
Itim|H
Jacquard 12|D
Jacquard 12 Charted|D
Jacquard 24|D
Jacquard 24 Charted|D
Jacquarda Bastarda 9|D
Jacquarda Bastarda 9 Charted|D
Jacques Francois|F
Jacques Francois Shadow|D
Jaini|D
Jaini Purva|D
Jaldi|S
Jaro|S
Jersey 10|D
Jersey 10 Charted|D
Jersey 15|D
Jersey 15 Charted|D
Jersey 20|D
Jersey 20 Charted|D
Jersey 25|D
Jersey 25 Charted|D
JetBrains Mono|M
Jim Nightshade|H
Joan|F
Jockey One|S
Jolly Lodger|D
Jomhuria|D
Jomolhari|F
Josefin Sans|S
Josefin Slab|F
Jost|S
Joti One|D
Jua|S
Judson|F
Julee|H
Julius Sans One|S
Junge|F
Jura|S
Just Another Hand|H
Just Me Again Down Here|H
K2D|S
Kablammo|D
Kadwa|F
Kaisei Decol|F
Kaisei HarunoUmi|F
Kaisei Opti|F
Kaisei Tokumin|F
Kalam|H
Kalnia|F
Kalnia Glaze|D
Kameron|F
Kanchenjunga|S
Kanit|S
Kantumruy Pro|S
Kapakana|H
Karantina|D
Karla|S
Karma|F
Katibeh|D
Kaushan Script|H
Kavivanar|H
Kavoon|D
Kay Pho Du|F
Kdam Thmor Pro|S
Keania One|D
Kedebideri|S
Kelly Slab|D
Kenia|D
Khand|S
Khula|S
Kings|H
Kirang Haerang|D
Kite One|S
Kiwi Maru|F
Klee One|H
Knewave|D
Kodchasan|S
Kode Mono|M
Koh Santepheap|F
KoHo|S
Kolker Brush|H
Konkhmer Sleokchher|D
Kosugi|S
Kosugi Maru|S
Kotta One|F
Koulen|D
Kranky|D
Kreon|F
Kripa|S
Kristi|H
Krona One|S
Krub|S
Kufam|S
Kulim Park|S
Kumar One|D
Kumar One Outline|D
Kumbh Sans|S
Kurale|F
La Belle Aurore|H
Labrada|F
Lacquer|D
Laila|F
Lakki Reddy|H
Lalezar|S
Lancelot|D
Langar|D
Lateef|F
Lato|S
Lavishly Yours|H
League Gothic|S
League Script|H
League Spartan|S
Leckerli One|H
Ledger|F
Lekton|M
Lemon|D
Lemonada|D
Lexend|S
Lexend Deca|S
Lexend Exa|S
Lexend Giga|S
Lexend Mega|S
Lexend Peta|S
Lexend Tera|S
Lexend Zetta|S
Libertinus Keyboard|D
Libertinus Mono|M
Libertinus Sans|S
Libertinus Serif|F
Libertinus Serif Display|D
Libre Barcode 128|D
Libre Barcode 128 Text|D
Libre Barcode 39|D
Libre Barcode 39 Extended|D
Libre Barcode 39 Extended Text|D
Libre Barcode 39 Text|D
Libre Barcode EAN13 Text|D
Libre Baskerville|F
Libre Bodoni|F
Libre Caslon Condensed|F
Libre Caslon Display|F
Libre Caslon Text|F
Libre Franklin|S
Licorice|H
Life Savers|D
Lilex|M
Lilita One|D
Lily Script One|D
Limelight|D
Linden Hill|F
LINE Seed JP|S
Lisu Bosa|F
Liter|S
Literata|F
Liu Jian Mao Cao|H
Livvic|S
Lobster|D
Lobster Two|D
Londrina Outline|D
Londrina Shadow|D
Londrina Sketch|D
Londrina Solid|D
Long Cang|H
Lora|F
Love Light|H
Love Ya Like A Sister|D
Loved by the King|H
Lovers Quarrel|H
Luckiest Guy|D
Lugrasimo|H
Lumanosimo|H
Lunasima|S
Lusitana|F
Lustria|F
Luxurious Roman|D
Luxurious Script|H
LXGW Marker Gothic|S
LXGW WenKai Mono TC|M
LXGW WenKai TC|H
M PLUS 1|S
M PLUS 1 Code|M
M PLUS 1p|S
M PLUS 2|S
M PLUS Code Latin|S
M PLUS Rounded 1c|S
M PLUS U|S
Ma Shan Zheng|H
Macondo|D
Macondo Swash Caps|D
Mada|S
Madimi One|S
Magra|S
Maiden Orange|F
Maitree|F
Major Mono Display|M
Mako|S
Mali|H
Mallanna|S
Maname|F
Mandali|S
Manjari|S
Manrope|S
Mansalva|H
Manuale|F
Manufacturing Consent|D
Marcellus|F
Marcellus SC|F
Marck Script|H
Margarine|D
Marhey|D
Markazi Text|F
Marko One|F
Marmelad|S
Martel|F
Martel Sans|S
Martian Mono|M
Marvel|S
Matangi|S
Mate|F
Mate SC|F
Matemasie|S
Maven Pro|S
McLaren|D
Mea Culpa|H
Meddon|H
MedievalSharp|D
Medula One|D
Meera Inimai|S
Megrim|D
Meie Script|H
Menbere|S
Meow Script|H
Merienda|H
Merriweather|F
Merriweather Sans|S
Metal|D
Metal Mania|D
Metamorphous|D
Metrophobic|S
Michroma|S
Micro 5|D
Micro 5 Charted|D
Milonga|D
Miltonian|D
Miltonian Tattoo|D
Mina|S
Mingzat|S
Miniver|D
Miranda Sans|S
Miriam Libre|S
Mirza|F
Miss Fajardose|H
Mitr|S
Mochiy Pop One|S
Mochiy Pop P One|S
Modak|D
Modern Antiqua|D
Moderustic|S
Mogra|D
Mohave|S
Moirai One|D
Molengo|S
Molle|H
Momo Signature|S
Momo Trust Display|S
Momo Trust Sans|S
Mona Sans|S
Monda|S
Monofett|M
Monomakh|D
Monomaniac One|S
Monoton|D
Monsieur La Doulaise|H
Montaga|F
Montagu Slab|F
MonteCarlo|H
Montenegrin Gothic One|F
Montez|H
Montserrat|S
Montserrat Alternates|S
Montserrat Underline|S
Moo Lah Lah|D
Mooli|S
Moon Dance|H
Moul|D
Moulpali|S
Mountains of Christmas|D
Mouse Memoirs|S
Mozilla Headline|S
Mozilla Text|S
Mr Bedfort|H
Mr Dafoe|H
Mr De Haviland|H
Mrs Saint Delafield|H
Mrs Sheppards|H
Ms Madi|H
Mukta|S
Mukta Mahee|S
Mukta Malar|S
Mukta Vaani|S
Mulish|S
Murecho|S
MuseoModerno|D
My Soul|H
Mynerve|H
Mystery Quest|D
Nabla|D
Namdhinggo|F
Nanum Brush Script|H
Nanum Gothic|S
Nanum Gothic Coding|H
Nanum Myeongjo|F
Nanum Pen Script|H
Narnoor|S
Nata Sans|S
National Park|S
Neonderthaw|H
Nerko One|H
Neucha|H
Neuton|F
New Amsterdam|S
New Rocker|D
New Tegomin|F
News Cycle|S
Newsreader|F
Niconne|H
Niramit|S
Nixie One|D
Nobile|S
Nokora|S
Norican|H
Nosifer|D
Notable|S
Nothing You Could Do|H
Noticia Text|F
Noto Kufi Arabic|S
Noto Music|S
Noto Naskh Arabic|F
Noto Nastaliq Urdu|F
Noto Rashi Hebrew|F
Noto Sans|S
Noto Sans Adlam|S
Noto Sans Adlam Unjoined|S
Noto Sans Anatolian Hieroglyphs|S
Noto Sans Arabic|S
Noto Sans Armenian|S
Noto Sans Avestan|S
Noto Sans Balinese|S
Noto Sans Bamum|S
Noto Sans Bassa Vah|S
Noto Sans Batak|S
Noto Sans Bengali|S
Noto Sans Bhaiksuki|S
Noto Sans Brahmi|S
Noto Sans Buginese|S
Noto Sans Buhid|S
Noto Sans Canadian Aboriginal|S
Noto Sans Carian|S
Noto Sans Caucasian Albanian|S
Noto Sans Chakma|S
Noto Sans Cham|S
Noto Sans Cherokee|S
Noto Sans Chorasmian|S
Noto Sans Coptic|S
Noto Sans Cuneiform|S
Noto Sans Cypriot|S
Noto Sans Cypro Minoan|S
Noto Sans Deseret|S
Noto Sans Devanagari|S
Noto Sans Display|S
Noto Sans Duployan|S
Noto Sans Egyptian Hieroglyphs|S
Noto Sans Elbasan|S
Noto Sans Elymaic|S
Noto Sans Ethiopic|S
Noto Sans Georgian|S
Noto Sans Glagolitic|S
Noto Sans Gothic|S
Noto Sans Grantha|S
Noto Sans Gujarati|S
Noto Sans Gunjala Gondi|S
Noto Sans Gurmukhi|S
Noto Sans Hanifi Rohingya|S
Noto Sans Hanunoo|S
Noto Sans Hatran|S
Noto Sans Hebrew|S
Noto Sans HK|S
Noto Sans Imperial Aramaic|S
Noto Sans Indic Siyaq Numbers|S
Noto Sans Inscriptional Pahlavi|S
Noto Sans Inscriptional Parthian|S
Noto Sans Javanese|S
Noto Sans JP|S
Noto Sans Kaithi|S
Noto Sans Kannada|S
Noto Sans Kawi|S
Noto Sans Kayah Li|S
Noto Sans Kharoshthi|S
Noto Sans Khmer|S
Noto Sans Khojki|S
Noto Sans Khudawadi|S
Noto Sans KR|S
Noto Sans Lao|S
Noto Sans Lao Looped|S
Noto Sans Lepcha|S
Noto Sans Limbu|S
Noto Sans Linear A|S
Noto Sans Linear B|S
Noto Sans Lisu|S
Noto Sans Lydian|S
Noto Sans Mahajani|S
Noto Sans Malayalam|S
Noto Sans Mandaic|S
Noto Sans Manichaean|S
Noto Sans Marchen|S
Noto Sans Masaram Gondi|S
Noto Sans Mayan Numerals|S
Noto Sans Medefaidrin|S
Noto Sans Meetei Mayek|S
Noto Sans Mende Kikakui|S
Noto Sans Meroitic|S
Noto Sans Miao|S
Noto Sans Modi|S
Noto Sans Mongolian|S
Noto Sans Mono|S
Noto Sans Mro|S
Noto Sans Multani|S
Noto Sans Myanmar|S
Noto Sans Nabataean|S
Noto Sans Nag Mundari|S
Noto Sans Nandinagari|S
Noto Sans New Tai Lue|S
Noto Sans Newa|S
Noto Sans NKo|S
Noto Sans NKo Unjoined|S
Noto Sans Nushu|S
Noto Sans Ogham|S
Noto Sans Ol Chiki|S
Noto Sans Old Hungarian|S
Noto Sans Old Italic|S
Noto Sans Old North Arabian|S
Noto Sans Old Permic|S
Noto Sans Old Persian|S
Noto Sans Old Sogdian|S
Noto Sans Old South Arabian|S
Noto Sans Old Turkic|S
Noto Sans Oriya|S
Noto Sans Osage|S
Noto Sans Osmanya|S
Noto Sans Pahawh Hmong|S
Noto Sans Palmyrene|S
Noto Sans Pau Cin Hau|S
Noto Sans PhagsPa|S
Noto Sans Phoenician|S
Noto Sans Psalter Pahlavi|S
Noto Sans Rejang|S
Noto Sans Runic|S
Noto Sans Samaritan|S
Noto Sans Saurashtra|S
Noto Sans SC|S
Noto Sans Sharada|S
Noto Sans Shavian|S
Noto Sans Siddham|S
Noto Sans SignWriting|S
Noto Sans Sinhala|S
Noto Sans Sogdian|S
Noto Sans Sora Sompeng|S
Noto Sans Soyombo|S
Noto Sans Sundanese|S
Noto Sans Sunuwar|S
Noto Sans Syloti Nagri|S
Noto Sans Symbols|S
Noto Sans Symbols 2|S
Noto Sans Syriac|S
Noto Sans Syriac Eastern|S
Noto Sans Syriac Western|S
Noto Sans Tagalog|S
Noto Sans Tagbanwa|S
Noto Sans Tai Le|S
Noto Sans Tai Tham|S
Noto Sans Tai Viet|S
Noto Sans Takri|S
Noto Sans Tamil|S
Noto Sans Tamil Supplement|S
Noto Sans Tangsa|S
Noto Sans TC|S
Noto Sans Telugu|S
Noto Sans Thaana|S
Noto Sans Thai|S
Noto Sans Thai Looped|S
Noto Sans Tifinagh|S
Noto Sans Tirhuta|S
Noto Sans Ugaritic|S
Noto Sans Vai|S
Noto Sans Vithkuqi|S
Noto Sans Wancho|S
Noto Sans Warang Citi|S
Noto Sans Yi|S
Noto Sans Zanabazar Square|S
Noto Serif|F
Noto Serif Ahom|F
Noto Serif Armenian|F
Noto Serif Balinese|F
Noto Serif Bengali|F
Noto Serif Devanagari|F
Noto Serif Display|F
Noto Serif Dives Akuru|F
Noto Serif Dogra|F
Noto Serif Ethiopic|F
Noto Serif Georgian|F
Noto Serif Grantha|F
Noto Serif Gujarati|F
Noto Serif Gurmukhi|F
Noto Serif Hebrew|F
Noto Serif Hentaigana|F
Noto Serif HK|F
Noto Serif JP|F
Noto Serif Kannada|F
Noto Serif Khitan Small Script|F
Noto Serif Khmer|F
Noto Serif Khojki|F
Noto Serif KR|F
Noto Serif Lao|F
Noto Serif Makasar|F
Noto Serif Malayalam|F
Noto Serif NP Hmong|F
Noto Serif Old Uyghur|F
Noto Serif Oriya|F
Noto Serif Ottoman Siyaq|F
Noto Serif SC|F
Noto Serif Sinhala|F
Noto Serif Tamil|F
Noto Serif Tangut|F
Noto Serif TC|F
Noto Serif Telugu|F
Noto Serif Thai|F
Noto Serif Tibetan|F
Noto Serif Todhri|F
Noto Serif Toto|F
Noto Serif Vithkuqi|F
Noto Serif Yezidi|F
Noto Traditional Nushu|S
Noto Znamenny Musical Notation|S
Nova Cut|D
Nova Flat|D
Nova Mono|M
Nova Oval|D
Nova Round|D
Nova Script|D
Nova Slim|D
Nova Square|D
NTR|S
Numans|S
Nunito|S
Nunito Sans|S
Nuosu SIL|S
Odibee Sans|D
Odor Mean Chey|F
Offside|D
Oi|D
Ojuju|S
Old Standard TT|F
Oldenburg|D
Ole|H
Oleo Script|D
Oleo Script Swash Caps|D
Onest|S
Oooh Baby|H
Open Sans|S
Oranienbaum|F
Orbit|S
Orbitron|S
Oregano|D
Orelega One|D
Orienta|S
Original Surfer|D
Oswald|S
Outfit|S
Over the Rainbow|H
Overlock|D
Overlock SC|D
Overpass|S
Overpass Mono|M
Ovo|F
Oxanium|D
Oxygen|S
Oxygen Mono|M
Pacifico|H
Padauk|S
Padyakke Expanded One|F
Palanquin|S
Palanquin Dark|S
Palette Mosaic|D
Pangolin|H
Paprika|D
Parastoo|F
Parisienne|H
Parkinsans|S
Passero One|D
Passion One|D
Passions Conflict|H
Pathway Extreme|S
Pathway Gothic One|S
Patrick Hand|H
Patrick Hand SC|H
Pattaya|S
Patua One|D
Pavanam|S
Paytone One|S
Peddana|F
Peralta|F
Permanent Marker|H
Petemoss|H
Petit Formal Script|H
Petrona|F
Philosopher|S
Phudu|D
Piazzolla|F
Piedra|D
Pinyon Script|H
Pirata One|D
Pixelify Sans|D
Plaster|D
Platypi|F
Play|S
Playball|D
Playfair|F
Playfair Display|F
Playfair Display SC|F
Playpen Sans|H
Playpen Sans Arabic|H
Playpen Sans Deva|H
Playpen Sans Hebrew|H
Playpen Sans Thai|H
Pliant|S
Plus Jakarta Sans|S
Pochaevsk|D
Podkova|F
Poetsen One|D
Poiret One|D
Poller One|D
Poltawski Nowy|F
Poly|F
Pompiere|D
Ponnala|D
Ponomar|D
Pontano Sans|S
Poor Story|D
Poppins|S
Port Lligat Sans|S
Port Lligat Slab|F
Potta One|D
Pragati Narrow|S
Praise|H
Prata|F
Preahvihear|S
Press Start 2P|D
Pridi|F
Princess Sofia|H
Prociono|F
Prompt|S
Prosto One|D
Protest Guerrilla|D
Protest Revolution|D
Protest Riot|D
Protest Strike|D
Proza Libre|S
PT Mono|M
PT Sans|S
PT Sans Caption|S
PT Sans Narrow|S
PT Serif|F
PT Serif Caption|F
Public Sans|S
Puppies Play|H
Puritan|S
Purple Purse|D
Qahiri|S
Quando|F
Quantico|S
Quattrocento|F
Quattrocento Sans|S
Questrial|S
Quicksand|S
Quintessential|H
Qwigley|H
Qwitcher Grypen|H
Racing Sans One|D
Radio Canada|S
Radio Canada Big|S
Radley|F
Rajdhani|S
Rakkas|D
Raleway|S
Raleway Dots|D
Ramabhadra|S
Ramaraja|F
Rambla|S
Rammetto One|D
Rampart One|D
Ramsina|F
Ranchers|D
Rancho|H
Ranga|D
Rasa|F
Rationale|S
Ravi Prakash|D
Readex Pro|S
Recursive|S
Red Hat Display|S
Red Hat Mono|M
Red Hat Text|S
Red Rose|D
Redacted|D
Redacted Script|D
Reddit Mono|M
Reddit Sans|S
Reddit Sans Condensed|S
Redressed|H
Reem Kufi|S
Reem Kufi Fun|S
Reem Kufi Ink|S
Reenie Beanie|H
Reggae One|D
REM|S
Rethink Sans|S
Revalia|D
Rhodium Libre|F
Ribeye|D
Ribeye Marrow|D
Righteous|D
Risque|D
Road Rage|D
Roboto|S
Roboto Condensed|S
Roboto Flex|S
Roboto Mono|M
Roboto Serif|F
Roboto Slab|F
Rochester|H
Rock 3D|D
Rock Salt|H
RocknRoll One|S
Rokkitt|F
Romanesco|H
Ropa Sans|S
Rosario|S
Rosarivo|F
Rouge Script|H
Rowdies|D
Rozha One|F
Rubik|S
Rubik 80s Fade|D
Rubik Beastly|D
Rubik Broken Fax|D
Rubik Bubbles|D
Rubik Burned|D
Rubik Dirt|D
Rubik Distressed|D
Rubik Doodle Shadow|D
Rubik Doodle Triangles|D
Rubik Gemstones|D
Rubik Glitch|D
Rubik Glitch Pop|D
Rubik Iso|D
Rubik Lines|D
Rubik Maps|D
Rubik Marker Hatch|D
Rubik Maze|D
Rubik Microbe|D
Rubik Mono One|S
Rubik Moonrocks|D
Rubik Pixels|D
Rubik Puddles|D
Rubik Scribble|D
Rubik Spray Paint|D
Rubik Storm|D
Rubik Vinyl|D
Rubik Wet Paint|D
Ruda|S
Rufina|F
Ruge Boogie|H
Ruluko|S
Rum Raisin|S
Ruslan Display|D
Russo One|S
Ruthie|H
Ruwudu|F
Rye|D
Sacramento|H
Sahitya|F
Sail|D
Saira|S
Saira Condensed|S
Saira Extra Condensed|S
Saira Semi Condensed|S
Saira Stencil|D
Salsa|D
Sanchez|F
Sancreek|D
Sankofa Display|S
Sansation|S
Sansita|S
Sansita Swashed|D
Sarabun|S
Sarala|S
Sarina|D
Sarpanch|S
Sassy Frass|H
Satisfy|H
Savate|S
Sawarabi Gothic|S
Sawarabi Mincho|F
Scada|S
Scheherazade New|F
Schibsted Grotesk|S
Schoolbell|H
Science Gothic|S
Scope One|F
Scoutie Sans|S
Seaweed Script|D
Secular One|S
Sedan|F
Sedan SC|F
Sedgwick Ave|H
Sedgwick Ave Display|H
Sekuya|D
Sen|S
Send Flowers|H
Sevillana|D
Seymour One|S
Shadows Into Light|H
Shadows Into Light Two|H
Shafarik|D
Shalimar|H
Shantell Sans|D
Shanti|S
Share|S
Share Tech|S
Share Tech Mono|M
Shippori Antique|S
Shippori Antique B1|S
Shippori Mincho|F
Shippori Mincho B1|F
Shizuru|D
Shojumaru|D
Short Stack|H
Shrikhand|D
Sigmar|D
Sigmar One|D
Signika|S
Signika Negative|S
Silkscreen|D
Simonetta|D
Single Day|D
Sintony|S
Sirin Stencil|D
Sirivennela|S
Six Caps|S
Sixtyfour|M
Sixtyfour Convergence|M
Skranji|D
Slabo 13px|F
Slabo 27px|F
Slackey|D
Slackside One|H
Smokum|D
Smooch|H
Smooch Sans|S
Smythe|D
SN Pro|S
Sniglet|D
Snippet|S
Snowburst One|D
Sofadi One|D
Sofia|H
Sofia Sans|S
Sofia Sans Condensed|S
Sofia Sans Extra Condensed|S
Sofia Sans Semi Condensed|S
Solitreo|H
Solway|F
Sometype Mono|M
Song Myung|F
Sono|S
Sonsie One|D
Sora|S
Sorts Mill Goudy|F
Sour Gummy|S
Source Code Pro|M
Source Sans 3|S
Source Serif 4|F
Space Grotesk|S
Space Mono|M
Special Elite|D
Special Gothic|S
Special Gothic Condensed One|S
Special Gothic Expanded One|S
Spectral|F
Spectral SC|F
Spicy Rice|D
Spinnaker|S
Spirax|D
Splash|H
Spline Sans|S
Spline Sans Mono|M
Squada One|D
Square Peg|H
Sree Krushnadevaraya|F
Sriracha|H
Srisakdi|D
Staatliches|D
Stack Sans Headline|S
Stack Sans Notch|S
Stack Sans Text|S
Stalemate|H
Stalinist One|D
Stardos Stencil|D
Stick|S
Stick No Bills|S
Stint Ultra Condensed|F
Stint Ultra Expanded|F
STIX Two Text|F
Stoke|F
Story Script|S
Strait|S
Strichpunkt Sans|S
Style Script|H
Stylish|S
Sue Ellen Francisco|H
Suez One|F
Sulphur Point|S
Sumana|F
Sunflower|S
Sunshiney|H
Supermercado One|D
Sura|F
Suranna|F
Suravaram|F
SUSE|S
SUSE Mono|S
Suwannaphum|F
Swanky and Moo Moo|H
Syncopate|S
Syne|S
Syne Mono|M
Syne Tactile|D
Tac One|S
Tagesschrift|D
Tai Heritage Pro|F
Tajawal|S
Tangerine|H
Tapestry|H
Taprom|D
TASA Explorer|S
TASA Orbiter|S
Tauri|S
Taviraj|F
Teachers|S
Teko|S
Tektur|D
Telex|S
Tenali Ramakrishna|S
Tenor Sans|S
Text Me One|S
Texturina|F
Thasadith|S
The Girl Next Door|H
The Nautigal|H
Tienne|F
TikTok Sans|S
Tillana|D
Tilt Neon|D
Tilt Prism|D
Tilt Warp|D
Timmana|S
Tinos|F
Tiny5|S
Tiro Bangla|F
Tiro Devanagari Hindi|F
Tiro Devanagari Marathi|F
Tiro Devanagari Sanskrit|F
Tiro Gurmukhi|F
Tiro Kannada|F
Tiro Tamil|F
Tiro Telugu|F
Tirra|S
Titan One|D
Titillium Web|S
Tomorrow|S
Tourney|D
Trade Winds|D
Train One|D
Triodion|D
Trirong|F
Trispace|S
Trocchi|F
Trochut|D
Truculenta|S
Trykker|F
Tsukimi Rounded|S
Tuffy|S
Tulpen One|D
Turret Road|D
Twinkle Star|H
Ubuntu|S
Ubuntu Condensed|S
Ubuntu Mono|M
Ubuntu Sans|S
Ubuntu Sans Mono|M
Uchen|F
Ultra|F
Unbounded|S
Uncial Antiqua|D
Underdog|D
Unica One|D
UnifrakturCook|D
UnifrakturMaguntia|D
Unkempt|D
Unlock|D
Unna|F
UoqMunThenKhung|F
Updock|H
Urbanist|S
Valley Sans|S
Vampiro One|D
Varela|S
Varela Round|S
Varta|S
Vast Shadow|F
Vazirmatn|S
Vend Sans|S
Vesper Libre|F
Viaoda Libre|D
Vibes|D
Vibur|H
Victor Mono|M
Vidaloka|F
Viga|S
Vina Sans|D
Voces|S
Volkhov|F
Vollkorn|F
Vollkorn SC|F
Voltaire|S
VT323|M
Vujahday Script|H
Waiting for the Sunrise|H
Wallpoet|D
Walter Turncoat|H
Warnes|D
Water Brush|H
Waterfall|H
WDXL Lubrifont JP N|S
WDXL Lubrifont SC|S
WDXL Lubrifont TC|S
Wellfleet|F
Wendy One|S
Whisper|H
WindSong|H
Winky Rough|S
Winky Sans|S
Wire One|S
Wittgenstein|F
Wix Madefor Display|S
Wix Madefor Text|S
Work Sans|S
Workbench|M
Xanh Mono|M
Yaldevi|S
Yanone Kaffeesatz|S
Yantramanav|S
Yarndings 12|D
Yarndings 12 Charted|D
Yarndings 20|D
Yarndings 20 Charted|D
Yatra One|D
Yellowtail|H
Yeon Sung|D
Yeseva One|D
Yesteryear|H
Yomogi|H
Young Serif|F
Yrsa|F
Ysabeau|S
Ysabeau Infant|S
Ysabeau Office|S
Ysabeau SC|S
Yuji Boku|F
Yuji Hentaigana Akari|H
Yuji Hentaigana Akebono|H
Yuji Mai|F
Yuji Syuku|F
Yusei Magic|S
Yuyu|H
Yuyu Short|H
Zain|S
Zalando Sans|S
Zalando Sans Expanded|S
Zalando Sans SemiExpanded|S
ZCOOL KuaiLe|S
ZCOOL QingKe HuangYou|S
ZCOOL XiaoWei|S
Zen Antique|F
Zen Antique Soft|F
Zen Dots|D
Zen Kaku Gothic Antique|S
Zen Kaku Gothic New|S
Zen Kurenaido|S
Zen Loop|D
Zen Maru Gothic|S
Zen Old Mincho|F
Zen Tokyo Zoo|D
Zeyada|H
Zhi Mang Xing|H
Zilla Slab|F
Zilla Slab Highlight|F`;

export interface GoogleFontEntry {
  family: string;
  category: string;
}

export const GOOGLE_FONTS: readonly GoogleFontEntry[] = RAW.split('\n').map((line) => {
  const [family = '', code = 'S'] = line.split('|');
  return { family, category: CATEGORY_LABELS[code] ?? '无衬线' };
});
