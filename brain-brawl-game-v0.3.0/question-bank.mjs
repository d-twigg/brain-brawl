// Curated offline fact bank. Questions are generated from reviewed fact tables,
// then assigned stable IDs so the browser can prevent repeats across sessions.

const COUNTRIES = `
Argentina|Buenos Aires|South America
Australia|Canberra|Oceania
Austria|Vienna|Europe
Belgium|Brussels|Europe
Brazil|Brasília|South America
Canada|Ottawa|North America
Chile|Santiago|South America
China|Beijing|Asia
Colombia|Bogotá|South America
Croatia|Zagreb|Europe
Cuba|Havana|North America
Czechia|Prague|Europe
Denmark|Copenhagen|Europe
Ecuador|Quito|South America
Egypt|Cairo|Africa
Ethiopia|Addis Ababa|Africa
Finland|Helsinki|Europe
France|Paris|Europe
Germany|Berlin|Europe
Ghana|Accra|Africa
Greece|Athens|Europe
Hungary|Budapest|Europe
Iceland|Reykjavík|Europe
India|New Delhi|Asia
Ireland|Dublin|Europe
Italy|Rome|Europe
Japan|Tokyo|Asia
Jordan|Amman|Asia
Kenya|Nairobi|Africa
Mexico|Mexico City|North America
Mongolia|Ulaanbaatar|Asia
Morocco|Rabat|Africa
Nepal|Kathmandu|Asia
Netherlands|Amsterdam|Europe
New Zealand|Wellington|Oceania
Nigeria|Abuja|Africa
Norway|Oslo|Europe
Pakistan|Islamabad|Asia
Peru|Lima|South America
Philippines|Manila|Asia
Poland|Warsaw|Europe
Portugal|Lisbon|Europe
Romania|Bucharest|Europe
Saudi Arabia|Riyadh|Asia
South Korea|Seoul|Asia
Spain|Madrid|Europe
Sweden|Stockholm|Europe
Thailand|Bangkok|Asia
Turkey|Ankara|Asia
United Kingdom|London|Europe`.trim().split("\n").map(row => row.split("|"));

const LANDMARKS = `
Eiffel Tower|Paris|France
Colosseum|Rome|Italy
Big Ben|London|United Kingdom
Statue of Liberty|New York City|United States
Golden Gate Bridge|San Francisco|United States
Space Needle|Seattle|United States
Gateway Arch|St. Louis|United States
CN Tower|Toronto|Canada
Christ the Redeemer|Rio de Janeiro|Brazil
Sagrada Família|Barcelona|Spain
Acropolis|Athens|Greece
Brandenburg Gate|Berlin|Germany
Sydney Opera House|Sydney|Australia
Burj Khalifa|Dubai|United Arab Emirates
Taj Mahal|Agra|India
Angkor Wat|Siem Reap|Cambodia
Forbidden City|Beijing|China
Great Pyramid of Giza|Giza|Egypt
Leaning Tower of Pisa|Pisa|Italy
Alhambra|Granada|Spain
Neuschwanstein Castle|Füssen|Germany
Atomium|Brussels|Belgium
Blue Mosque|Istanbul|Turkey
Table Mountain|Cape Town|South Africa
Petronas Towers|Kuala Lumpur|Malaysia
Taipei 101|Taipei|Taiwan
Tokyo Tower|Tokyo|Japan
Fushimi Inari Shrine|Kyoto|Japan
Gyeongbokgung Palace|Seoul|South Korea
Wat Arun|Bangkok|Thailand
Ho Chi Minh Mausoleum|Hanoi|Vietnam
Independence Palace|Ho Chi Minh City|Vietnam
Shwedagon Pagoda|Yangon|Myanmar
Boudhanath Stupa|Kathmandu|Nepal
Lotus Temple|New Delhi|India
Victoria Memorial|Kolkata|India
Gateway of India|Mumbai|India
Charminar|Hyderabad|India
Hawa Mahal|Jaipur|India
Sheikh Zayed Grand Mosque|Abu Dhabi|United Arab Emirates
Museum of Islamic Art|Doha|Qatar
Jerónimos Monastery|Lisbon|Portugal
Prague Castle|Prague|Czechia
Fisherman's Bastion|Budapest|Hungary
Palace of Parliament|Bucharest|Romania
Temppeliaukio Church|Helsinki|Finland
Little Mermaid statue|Copenhagen|Denmark
Stockholm City Hall|Stockholm|Sweden
Hallgrímskirkja|Reykjavík|Iceland
Edinburgh Castle|Edinburgh|Scotland`.trim().split("\n").map(row => row.split("|"));

const ELEMENTS = `
Hydrogen|H|1
Helium|He|2
Lithium|Li|3
Beryllium|Be|4
Boron|B|5
Carbon|C|6
Nitrogen|N|7
Oxygen|O|8
Fluorine|F|9
Neon|Ne|10
Sodium|Na|11
Magnesium|Mg|12
Aluminum|Al|13
Silicon|Si|14
Phosphorus|P|15
Sulfur|S|16
Chlorine|Cl|17
Argon|Ar|18
Potassium|K|19
Calcium|Ca|20
Scandium|Sc|21
Titanium|Ti|22
Vanadium|V|23
Chromium|Cr|24
Manganese|Mn|25
Iron|Fe|26
Cobalt|Co|27
Nickel|Ni|28
Copper|Cu|29
Zinc|Zn|30
Gallium|Ga|31
Germanium|Ge|32
Arsenic|As|33
Selenium|Se|34
Bromine|Br|35
Krypton|Kr|36
Rubidium|Rb|37
Strontium|Sr|38
Yttrium|Y|39
Zirconium|Zr|40
Niobium|Nb|41
Molybdenum|Mo|42
Technetium|Tc|43
Ruthenium|Ru|44
Rhodium|Rh|45
Palladium|Pd|46
Silver|Ag|47
Cadmium|Cd|48
Indium|In|49
Tin|Sn|50`.trim().split("\n").map(row => { const [name, symbol, number] = row.split("|"); return { name, symbol, number: Number(number) }; });

const EVENTS = `
1215|Magna Carta is sealed
1453|Constantinople falls to the Ottoman Empire
1492|Columbus begins his first Atlantic voyage
1517|Martin Luther publishes the Ninety-five Theses
1588|The Spanish Armada is defeated
1607|Jamestown is founded
1620|The Mayflower reaches New England
1666|The Great Fire of London occurs
1687|Newton publishes Principia
1776|The U.S. Declaration of Independence is adopted
1789|The French Revolution begins
1804|Haiti declares independence
1815|The Battle of Waterloo occurs
1826|The earliest surviving photograph is created
1837|Samuel Morse demonstrates the telegraph
1859|Darwin publishes On the Origin of Species
1869|Mendeleev presents his periodic table
1876|Bell patents the telephone
1879|Edison demonstrates a practical incandescent lamp
1889|The Eiffel Tower opens
1896|The first modern Olympic Games are held
1903|The Wright brothers make their first powered flight
1905|Einstein publishes special relativity
1912|The Titanic sinks
1914|World War I begins
1917|The Russian Revolution occurs
1920|U.S. women gain the constitutional right to vote
1928|Alexander Fleming discovers penicillin
1929|The Wall Street Crash occurs
1936|The BBC begins regular television broadcasts
1939|World War II begins in Europe
1945|The United Nations is founded
1947|The transistor is invented
1953|Everest is first confirmed summited
1957|Sputnik 1 launches
1961|Yuri Gagarin orbits Earth
1969|Apollo 11 lands on the Moon
1971|The first networked email is sent
1976|Apple Computer is founded
1977|Voyager 1 launches
1981|The first Space Shuttle mission launches
1986|The Chernobyl disaster occurs
1989|The Berlin Wall falls
1990|The Hubble Space Telescope launches
1991|The World Wide Web becomes publicly available
1994|Nelson Mandela becomes president of South Africa
1996|Dolly the sheep is born
1998|Google is founded
2001|Wikipedia launches
2005|YouTube launches`.trim().split("\n").map(row => { const [year, event] = row.split("|"); return { year: Number(year), event }; });

const GROUPS = [
  ["Noble gases", "Helium", "Neon", "Argon", "Krypton", "Xenon", "Radon", "Oganesson", "Neon lights"],
  ["Greek gods", "Zeus", "Hera", "Poseidon", "Athena", "Apollo", "Artemis", "Ares", "Hermes"],
  ["Shakespeare plays", "Hamlet", "Macbeth", "Othello", "King Lear", "The Tempest", "Twelfth Night", "Romeo and Juliet", "Julius Caesar"],
  ["Impressionist painters", "Monet", "Renoir", "Degas", "Pissarro", "Morisot", "Sisley", "Cassatt", "Caillebotte"],
  ["African countries", "Kenya", "Ghana", "Morocco", "Nigeria", "Senegal", "Ethiopia", "Namibia", "Uganda"],
  ["South American countries", "Brazil", "Argentina", "Chile", "Peru", "Colombia", "Ecuador", "Uruguay", "Paraguay"],
  ["Bones", "Femur", "Tibia", "Fibula", "Humerus", "Radius", "Ulna", "Scapula", "Patella"],
  ["Cloud types", "Cirrus", "Cumulus", "Stratus", "Nimbus", "Cumulonimbus", "Altostratus", "Cirrostratus", "Stratocumulus"],
  ["Chess terms", "Checkmate", "Castling", "Gambit", "Stalemate", "Bishop", "Rook", "En passant", "Pawn"],
  ["Baseball terms", "Home run", "Shortstop", "Bullpen", "Inning", "Fastball", "Dugout", "Bunt", "Double play"],
  ["Soccer terms", "Offside", "Corner kick", "Hat trick", "Penalty area", "Goalkeeper", "Free kick", "Nutmeg", "Clean sheet"],
  ["Kitchen tools", "Whisk", "Colander", "Spatula", "Ladle", "Tongs", "Peeler", "Grater", "Rolling pin"],
  ["Programming languages", "Python", "Java", "Ruby", "Swift", "Rust", "Kotlin", "Fortran", "JavaScript"],
  ["Gemstones", "Ruby", "Sapphire", "Emerald", "Opal", "Topaz", "Amethyst", "Garnet", "Aquamarine"],
  ["Dog breeds", "Beagle", "Poodle", "Boxer", "Husky", "Dalmatian", "Greyhound", "Pug", "Rottweiler"],
  ["Classical composers", "Bach", "Mozart", "Beethoven", "Chopin", "Vivaldi", "Handel", "Brahms", "Tchaikovsky"],
  ["Renaissance artists", "Leonardo da Vinci", "Michelangelo", "Raphael", "Donatello", "Titian", "Botticelli", "Ghiberti", "Giorgione"],
  ["Dinosaurs", "Triceratops", "Stegosaurus", "Velociraptor", "Brachiosaurus", "Allosaurus", "Ankylosaurus", "Spinosaurus", "Diplodocus"],
  ["World currencies", "Yen", "Euro", "Peso", "Rupee", "Won", "Franc", "Krona", "Dinar"],
  ["Mountain ranges", "Andes", "Himalayas", "Alps", "Rockies", "Atlas", "Urals", "Pyrenees", "Appalachians"],
  ["String instruments", "Violin", "Cello", "Harp", "Guitar", "Viola", "Banjo", "Mandolin", "Ukulele"],
  ["Egyptian gods", "Ra", "Osiris", "Isis", "Anubis", "Horus", "Set", "Thoth", "Bastet"],
  ["U.S. national parks", "Yellowstone", "Yosemite", "Zion", "Acadia", "Everglades", "Arches", "Glacier", "Denali"],
  ["Constellations", "Orion", "Cassiopeia", "Scorpius", "Cygnus", "Andromeda", "Pegasus", "Draco", "Lyra"],
  ["Parts of a cell", "Nucleus", "Mitochondrion", "Ribosome", "Cytoplasm", "Cell membrane", "Golgi apparatus", "Vacuole", "Chromosome"]
];

const buzz = [];
COUNTRIES.forEach(([country, capital, continent], index) => {
  buzz.push({ id: `country-${index}`, type: "buzz", prompt: "Name the country", clues: [`My capital is ${capital}.`, `I am located in ${continent}.`, `My name begins with ${country[0]}.`, `I am ${country}.`], answers: [country], displayAnswer: country, duration: 19000 });
  buzz.push({ id: `capital-${index}`, type: "buzz", prompt: "Name the capital city", clues: [`I am the capital of ${country}.`, `I am located in ${continent}.`, `My name begins with ${capital[0]}.`, `I am ${capital}.`], answers: [capital], displayAnswer: capital, duration: 19000 });
});
LANDMARKS.forEach(([landmark, city, country], index) => {
  buzz.push({ id: `landmark-${index}`, type: "buzz", prompt: "Name the landmark", clues: [`You can find me in ${city}, ${country}.`, `I am one of ${city}'s best-known sights.`, "Travelers often photograph me.", `I am ${landmark}.`], answers: [landmark], displayAnswer: landmark, duration: 19000 });
  buzz.push({ id: `city-landmark-${index}`, type: "buzz", prompt: "Name the city", clues: [`I am home to ${landmark}.`, `I am located in ${country}.`, `My name begins with ${city[0]}.`, `I am ${city}.`], answers: [city], displayAnswer: city, duration: 19000 });
});

const connection = [];
GROUPS.forEach(([answer, ...items], groupIndex) => {
  for (let variant = 0; variant < 4; variant++) {
    const clues = [0, 1, 3, 6].map(offset => items[(variant * 2 + offset) % items.length]);
    connection.push({ id: `connection-${groupIndex}-${variant}`, type: "connection", prompt: "What connects these clues?", clues, answers: [answer], displayAnswer: answer, duration: 18000 });
  }
});

const order = [];
for (let index = 0; index < 50; index++) {
  const picked = [index, index + 7, index + 19, index + 31].map(value => ELEMENTS[value % ELEMENTS.length]);
  order.push({ id: `element-order-${index}`, type: "order", prompt: "Order these elements by atomic number, lowest first.", items: picked.map(item => item.name), correct: [...picked].sort((a, b) => a.number - b.number).map(item => item.name), displayAnswer: [...picked].sort((a, b) => a.number - b.number).map(item => item.name).join(" → "), duration: 22000 });
}
for (let index = 0; index < 50; index++) {
  const picked = [index, index + 9, index + 21, index + 34].map(value => EVENTS[value % EVENTS.length]);
  order.push({ id: `event-order-${index}`, type: "order", prompt: "Put these events in chronological order.", items: picked.map(item => item.event), correct: [...picked].sort((a, b) => a.year - b.year).map(item => item.event), displayAnswer: [...picked].sort((a, b) => a.year - b.year).map(item => item.event).join(" → "), duration: 22000 });
}

const slider = [
  ...ELEMENTS.map((item, index) => ({ id: `atomic-${index}`, type: "slider", prompt: `What is the atomic number of ${item.name}?`, min: 0, max: 100, step: 1, target: item.number, unit: "", displayAnswer: String(item.number), duration: 18000 })),
  ...EVENTS.map((item, index) => ({ id: `year-${index}`, type: "slider", prompt: `In what year did this happen: ${item.event}?`, min: Math.max(0, item.year - 150), max: item.year + 150, step: 1, target: item.year, unit: "", displayAnswer: String(item.year), duration: 18000 }))
];

export const QUESTION_POOLS = { buzz, connection, order, slider };
export const QUESTION_BANK = [...buzz, ...connection, ...order, ...slider];

if (QUESTION_BANK.length !== 500) throw new Error(`Expected 500 bank entries, received ${QUESTION_BANK.length}`);
