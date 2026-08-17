// Ported from project/app/data.jsx — São Paulo mock dataset for Rota by Flui.
// Field names kept identical to the source (see docs/HANDOFF.md §3), except CSS
// `var(--token)` color references on `reports[].color`, which became `colorToken`
// (a key into theme colors) since RN has no CSS custom properties.
import { RotaData } from './types';

export const DATA: RotaData = {
  user: {
    name: 'Marina Costa', handle: '@marina', initials: 'MC',
    level: 7, title: 'Guia da Rota', wattsLabel: 'Watts',
    watts: 4820, nextLevel: 6000, streak: 12,
    contributions: 87, reviews: 41, photos: 63, reports: 18,
    car: 'BYD Dolphin', favorites: 3,
  },

  cars: [
    { id: 'dolphin', brand: 'BYD', model: 'Dolphin', battery: 44.9, range: 291, connector: 'CCS2', ackw: 7, dckw: 60 },
    { id: 'seal', brand: 'BYD', model: 'Seal', battery: 82.5, range: 460, connector: 'CCS2', ackw: 11, dckw: 150 },
    { id: 'ora03', brand: 'GWM', model: 'Ora 03', battery: 48, range: 310, connector: 'CCS2', ackw: 11, dckw: 64 },
    { id: 'xc40', brand: 'Volvo', model: 'EX40 Recharge', battery: 69, range: 425, connector: 'CCS2', ackw: 11, dckw: 130 },
    { id: 'kwid', brand: 'Renault', model: 'Kwid E-Tech', battery: 26.8, range: 185, connector: 'CCS2', ackw: 7, dckw: 30 },
    { id: 'model3', brand: 'Tesla', model: 'Model 3', battery: 60, range: 430, connector: 'CCS2', ackw: 11, dckw: 170 },
    { id: 'bz4x', brand: 'Toyota', model: 'bZ4X', battery: 71, range: 410, connector: 'CCS2', ackw: 11, dckw: 150 },
    { id: 'leaf', brand: 'Nissan', model: 'Leaf', battery: 40, range: 270, connector: 'CHAdeMO', ackw: 6.6, dckw: 50 },
  ],

  // map space ≈ 1000 × 1500; user near 500,770 (legacy illustrated-map coordinate space)
  user_xy: { x: 500, y: 772 },
  // real-world position used by the interactive map (Av. Paulista / Consolação)
  user_geo: { lat: -23.5558, lng: -46.6620 },
  map_default: { lat: -23.5720, lng: -46.6750, zoom: 13 },

  stations: [
    {
      id: 'st1', name: 'Pátio Higienópolis', area: 'Higienópolis', x: 452, y: 690, lat: -23.5445, lng: -46.6600,
      dist: '1,2 km', avail: 'ok', selo: 3, rating: 4.9, reviews: 312,
      free: 4, total: 6, power: 150, connectors: ['CCS2', 'Type 2'], price: 1.89,
      hours: '24 h', quiet: '14h – 16h', cover: true,
      amenities: ['coffee', 'food', 'wc', 'parking', 'wifi', 'shield', 'store'],
      tags: ['Coberto', 'Shopping', 'Seguro'],
      blurb: 'Referência da cidade. Carregadores ultrarrápidos no subsolo coberto, ao lado da praça de alimentação. Vale a parada mesmo com a bateria em 50%.',
      reviewsList: [
        { who: 'Rafael A.', when: '2 d', stars: 5, body: 'Seis pontos, nunca peguei fila. 150 kW de verdade — 20 a 80% em 28 min no meu Seal.', helpful: 24, car: 'BYD Seal' },
        { who: 'Júlia M.', when: '1 sem', stars: 5, body: 'Coberto e com segurança 24h. Carrego à noite tranquila enquanto janto.', helpful: 17, car: 'Volvo EX40' },
      ],
    },
    {
      id: 'st2', name: 'Eletroposto Faria Lima', area: 'Itaim Bibi', x: 560, y: 840, lat: -23.5860, lng: -46.6820,
      dist: '2,0 km', avail: 'busy', selo: 2, rating: 4.6, reviews: 198,
      free: 1, total: 4, power: 120, connectors: ['CCS2'], price: 2.10,
      hours: '06h – 23h', quiet: '10h – 11h', cover: false,
      amenities: ['coffee', 'wc', 'wifi', 'store'],
      tags: ['Movimentado', 'Café ao lado'],
      blurb: 'No coração da Faria Lima. Lota no horário de almoço — chegue cedo ou caia no fim da tarde. Café especial na esquina enquanto espera.',
      reviewsList: [
        { who: 'Bruno C.', when: '3 d', stars: 4, body: 'Ótima localização mas concorrido. App ajudou a ver que tinha 1 livre antes de subir.', helpful: 12, car: 'Tesla Model 3' },
      ],
    },
    {
      id: 'st3', name: 'Parque Ibirapuera', area: 'Moema', x: 540, y: 940, lat: -23.5874, lng: -46.6576,
      dist: '3,4 km', avail: 'ok', selo: 2, rating: 4.7, reviews: 156,
      free: 3, total: 4, power: 60, connectors: ['CCS2', 'Type 2', 'GB/T'], price: 1.50,
      hours: '05h – 24h', quiet: '15h – 17h', cover: false,
      amenities: ['coffee', 'wc', 'parking', 'leaf', 'food'],
      tags: ['Área verde', 'Bom para esperar'],
      blurb: 'Carregue enquanto caminha no parque. 40 min de recarga = uma volta na lagoa e um café. A experiência que o Guia recomenda.',
      reviewsList: [
        { who: 'Camila R.', when: '5 d', stars: 5, body: 'Melhor lugar para esperar a recarga da cidade. Levo o cachorro, dou uma volta e volto carregado.', helpful: 31, car: 'GWM Ora 03' },
      ],
    },
    {
      id: 'st4', name: 'Shopping Eldorado', area: 'Pinheiros', x: 410, y: 800, lat: -23.5720, lng: -46.6989,
      dist: '2,8 km', avail: 'ok', selo: 1, rating: 4.3, reviews: 88,
      free: 2, total: 3, power: 50, connectors: ['CCS2', 'Type 2'], price: 1.79,
      hours: '10h – 22h', quiet: '11h – 12h', cover: true,
      amenities: ['food', 'wc', 'parking', 'store', 'wifi'],
      tags: ['Coberto', 'Shopping'],
      blurb: 'Estacionamento coberto com 3 pontos no piso G2. Cinema e praça de alimentação à disposição durante a recarga.',
      reviewsList: [
        { who: 'Diego F.', when: '1 sem', stars: 4, body: 'Prático para quem vai ao cinema. Sinalização poderia ser melhor, demorei pra achar.', helpful: 8, car: 'Renault Kwid' },
      ],
    },
    {
      id: 'st5', name: 'Posto Berrini Energy', area: 'Brooklin', x: 590, y: 1010, lat: -23.6110, lng: -46.6960,
      dist: '5,1 km', avail: 'off', selo: 0, rating: 3.8, reviews: 54,
      free: 0, total: 2, power: 50, connectors: ['CCS2'], price: 2.30,
      hours: '24 h', quiet: '03h – 05h', cover: false,
      amenities: ['wc', 'store'],
      tags: ['24 h'],
      blurb: 'Opção de emergência na Berrini. Dois pontos apenas e um costuma estar fora do ar — confira os reportes da comunidade antes de ir.',
      reviewsList: [
        { who: 'Lucas P.', when: '2 d', stars: 2, body: 'Um carregador quebrado há semanas. Reportei pra galera não perder a viagem.', helpful: 19, car: 'Nissan Leaf' },
      ],
    },
    {
      id: 'st6', name: 'Mirante Paulista', area: 'Bela Vista', x: 470, y: 620, lat: -23.5614, lng: -46.6559,
      dist: '3,9 km', avail: 'ok', selo: 1, rating: 4.4, reviews: 71,
      free: 2, total: 2, power: 22, connectors: ['Type 2'], price: 1.20,
      hours: '08h – 20h', quiet: '09h – 10h', cover: false,
      amenities: ['coffee', 'food', 'wifi', 'mountain'],
      tags: ['Carga lenta', 'Vista'],
      blurb: 'Carga AC para quem vai ficar um tempo. Vista da Paulista, cafés e cultura ao redor — pensado para visitas longas, não para passagem rápida.',
      reviewsList: [],
    },
    {
      id: 'st7', name: 'Vila Madalena Hub', area: 'Vila Madalena', x: 380, y: 700, lat: -23.5540, lng: -46.6900,
      dist: '3,1 km', avail: 'ok', selo: 2, rating: 4.8, reviews: 134,
      free: 2, total: 3, power: 90, connectors: ['CCS2', 'Type 2', 'GB/T'], price: 1.95,
      hours: '07h – 01h', quiet: '15h – 17h', cover: true,
      amenities: ['coffee', 'food', 'wc', 'wifi', 'store', 'shield'],
      tags: ['Coberto', 'Boêmio', 'Seguro'],
      blurb: 'Bares, arte e gastronomia. Recarga rápida coberta no melhor point da Vila. A comunidade ama parar aqui no fim de tarde.',
      reviewsList: [
        { who: 'Ana T.', when: '4 d', stars: 5, body: 'Carrego e já emendo no happy hour. Lugar seguro e bem iluminado.', helpful: 22, car: 'BYD Dolphin' },
      ],
    },
  ],

  // community reports on map (Waze-style)
  reports: [
    { id: 'r1', x: 520, y: 760, lat: -23.5735, lng: -46.6975, type: 'fila', icon: 'users', colorToken: 'busy', kind: 'Fila / lotado', label: 'Fila moderada agora', who: 'Pedro', when: '8 min', station: 'Shopping Eldorado', confirms: 6,
      desc: 'Dois carros esperando vaga. A rotatividade está boa — a espera média é de 15 a 20 minutos.' },
    { id: 'r2', x: 600, y: 1010, lat: -23.6100, lng: -46.6945, type: 'quebrado', icon: 'alert', colorToken: 'off', kind: 'Fora do ar', label: 'Carregador fora do ar', who: 'Lucas', when: '22 min', station: 'Posto Ipiranga · Faria Lima', confirms: 11,
      desc: 'O conector CCS2 não inicia a sessão. O da esquerda (Type 2) segue funcionando normalmente.' },
    { id: 'r3', x: 430, y: 880, lat: -23.5450, lng: -46.6585, type: 'preco', icon: 'dollar', colorToken: 'primary', kind: 'Preço mudou', label: 'Preço atualizado: R$ 1,79', who: 'Sofia', when: '1 h', station: 'Pátio Higienópolis', confirms: 4,
      desc: 'Subiu de R$ 1,65 para R$ 1,79 por kWh. Ainda é um dos melhores preços da Zona Oeste.' },
    { id: 'r4', x: 470, y: 660, lat: -23.5885, lng: -46.6560, type: 'livre', icon: 'check', colorToken: 'ok', kind: 'Pontos livres', label: '2 pontos livres agora', who: 'Marina', when: '3 min', station: 'Parque Ibirapuera', confirms: 9,
      desc: 'Acabei de sair e deixei duas vagas livres. Carregador de 60 kW funcionando redondo.' },
  ],

  feed: [
    { id: 'f1', who: 'Rafael A.', initials: 'RA', when: '12 min', type: 'review', station: 'Pátio Higienópolis', stars: 5, body: '20→80% em 28 minutos. Esse lugar merece os 3 selos, sem discussão.', likes: 14, comments: 3, photo: true },
    { id: 'f2', who: 'Sofia L.', initials: 'SL', when: '1 h', type: 'report', station: 'Shopping Eldorado', body: 'Atualizei o preço pra R$ 1,79 — estava desatualizado no app.', likes: 9, comments: 1, photo: false },
    { id: 'f3', who: 'Diego F.', initials: 'DF', when: '3 h', type: 'badge', body: 'desbloqueou a conquista "Pioneiro da Zona Oeste" 🏅', likes: 27, comments: 6, photo: false },
    { id: 'f4', who: 'Camila R.', initials: 'CR', when: '5 h', type: 'photo', station: 'Parque Ibirapuera', body: 'Recarga com vista. Recomendo demais pra quem tem tempo.', likes: 41, comments: 8, photo: true },
  ],

  missions: [
    { id: 'm1', icon: 'camera', title: 'Olho de águia', desc: 'Adicione 3 fotos a pontos sem imagem', reward: 150, prog: 2, total: 3 },
    { id: 'm2', icon: 'star', title: 'Crítico da semana', desc: 'Avalie 5 pontos de recarga', reward: 200, prog: 3, total: 5 },
    { id: 'm3', icon: 'flag', title: 'Vigia da rede', desc: 'Confirme o status de 4 carregadores', reward: 120, prog: 4, total: 4, done: true },
    { id: 'm4', icon: 'route', title: 'Desbravador', desc: 'Visite um ponto em um novo bairro', reward: 250, prog: 0, total: 1 },
  ],

  badges: [
    { id: 'b1', icon: 'sparkle', name: 'Primeira recarga', earned: true },
    { id: 'b2', icon: 'camera', name: 'Fotógrafo', earned: true },
    { id: 'b3', icon: 'flame', name: 'Sequência 7d', earned: true },
    { id: 'b4', icon: 'star', name: '50 avaliações', earned: true },
    { id: 'b5', icon: 'flag', name: 'Pioneiro Oeste', earned: true },
    { id: 'b6', icon: 'crown', name: 'Top 10 SP', earned: false },
    { id: 'b7', icon: 'route', name: 'Viajante', earned: false },
    { id: 'b8', icon: 'shield', name: 'Guardião', earned: false },
  ],

  leaderboard: [
    { rank: 1, who: 'Henrique V.', initials: 'HV', watts: 9120, up: true },
    { rank: 2, who: 'Patrícia M.', initials: 'PM', watts: 7340, up: true },
    { rank: 3, who: 'Carlos E.', initials: 'CE', watts: 6610, up: false },
    { rank: 4, who: 'Você', initials: 'MC', watts: 4820, me: true, up: true },
    { rank: 5, who: 'Tatiana R.', initials: 'TR', watts: 4510, up: false },
  ],

  // route planner — SP → Campinas with charge stops
  route: {
    from: 'Pinheiros, São Paulo', to: 'Campinas, SP',
    distance: 98, duration: '1h24', startBattery: 62, arriveBattery: 54,
    stops: [
      { kind: 'start', name: 'Pinheiros', sub: 'Saída · bateria 62%', battery: 62 },
      { kind: 'charge', name: 'Eletroposto Bandeirantes', sub: 'Recarga 18 min · 50→80% · km 32', power: 150, time: 18, battery: 80, selo: 2 },
      { kind: 'end', name: 'Campinas', sub: 'Chegada · bateria 54%', battery: 54 },
    ],
  },

  // ============ GUIA FLUI · roteiros curados de elétrico (estilo guia) ============
  guides: [
    {
      id: 'g1', cat: 'serra', kicker: 'Fim de semana', selo: 3,
      title: 'Serra da Mantiqueira', region: 'Campos do Jordão · SP',
      cover: 'serra ao amanhecer', distance: 167, duration: '2h40', recharges: 1, season: 'Mai – Ago',
      blurb: 'A serra sem ansiedade de bateria: uma recarga estratégica em Taubaté e a Mantiqueira é sua.',
      blurbLong: 'Subir a serra de elétrico tem um bônus silencioso — você ouve a mata. O Guia posicionou a recarga no ponto exato em que o almoço cai bem, para você chegar em Capivari com 80% e a tarde inteira pela frente.',
      tags: ['Serra', 'Frio', 'Gastronomia'],
      stops: [
        { kind: 'start', name: 'São Paulo', sub: 'Saída pela Rod. Ayrton Senna', time: '08:00', todo: '' },
        { kind: 'stop', name: 'Tremembé', sub: 'Café colonial da serra', time: '09:30', dur: '45 min', icon: 'coffee', todo: 'Pães de queijo, bolos e o famoso café colonial antes de pegar altitude.' },
        { kind: 'charge', name: 'Taubaté · Via Vale', sub: 'Recarga · 45 → 85%', time: '10:40', dur: '35 min', power: 150, selo: 2, todo: 'Almoço no shopping enquanto o carro recupera o fôlego para a subida.' },
        { kind: 'stop', name: 'Campos do Jordão · Capivari', sub: '2 noites', time: '12:30', dur: '2 noites', icon: 'mountain', todo: 'Chocolate quente, cervejarias artesanais e o Horto Florestal logo cedo.' },
        { kind: 'end', name: 'Pico do Itapeva', sub: 'Pôr do sol', time: 'Dia 2 · 17:00', icon: 'sun', todo: 'O mirante mais alto da região. Leve casaco — e a câmera.' },
      ],
    },
    {
      id: 'g2', cat: 'praia', kicker: 'Praia', selo: 2,
      title: 'Litoral Norte', region: 'Ubatuba · SP',
      cover: 'enseada deserta de manhã', distance: 230, duration: '3h20', recharges: 1, season: 'Out – Mar',
      blurb: 'Encha a bateria em Caraguá antes da serra — e desça para o mar com folga de sobra.',
      blurbLong: 'A descida da Tamoios consome menos do que parece — a regeneração trabalha por você. Mas a subida na volta cobra o preço. Por isso a recarga vai antes, em Caraguatatuba, deixando suas praias sem relógio.',
      tags: ['Praia', 'Surf', 'Natureza'],
      stops: [
        { kind: 'start', name: 'São Paulo', sub: 'Saída pela Carvalho Pinto', time: '07:30', todo: '' },
        { kind: 'charge', name: 'Caraguatatuba · Serramar', sub: 'Recarga · 30 → 80%', time: '10:00', dur: '40 min', power: 120, selo: 2, todo: 'Pé na areia e um caldo de cana enquanto o carro enche para o fim de semana.' },
        { kind: 'stop', name: 'Praia do Félix', sub: 'Manhã de praia', time: '11:30', dur: '3 h', icon: 'sun', todo: 'Mar calmo numa enseada protegida — a preferida das famílias.' },
        { kind: 'stop', name: 'Itamambuca', sub: 'Surf & mata atlântica', dur: 'tarde', icon: 'leaf', todo: 'Point de surfe com a floresta colada na areia. Fim de tarde perfeito.' },
        { kind: 'end', name: 'Centro & Projeto Tamar', sub: '1 – 2 noites', icon: 'food', todo: 'Tartarugas pela manhã, peixe fresco no porto à noite.' },
      ],
    },
    {
      id: 'g3', cat: 'bate-volta', kicker: 'Bate-volta', selo: 1,
      title: 'Estrada do Vinho', region: 'São Roque · SP',
      cover: 'parreiral ao fim de tarde', distance: 60, duration: '1h05', recharges: 0, season: 'Ano todo',
      blurb: '60 km de ida: dá para ir e voltar com a carga do dia, sem parada técnica.',
      blurbLong: 'A Estrada do Vinho cabe inteira numa carga só. O Guia sugere sair com 70%, encarar as cantinas sem pressa e voltar com folga — a recarga, se quiser, é só um cafezinho no shopping na chegada.',
      tags: ['Vinho', 'Gastronomia', 'Bate-volta'],
      stops: [
        { kind: 'start', name: 'São Paulo', sub: 'Saída pela Castello Branco', time: '10:00', todo: '' },
        { kind: 'stop', name: 'Estrada do Vinho · km 4', sub: 'Vinícolas', time: '11:00', dur: '2 h', icon: 'leaf', todo: 'Degustação em três cantinas e a famosa alcachofra da região.' },
        { kind: 'stop', name: 'Almoço · cantina italiana', sub: 'Sem pressa', time: '13:00', dur: '2 h', icon: 'food', todo: 'Massa caseira e vinho da casa com vista para os parreirais.' },
        { kind: 'end', name: 'Retorno a São Paulo', sub: 'Volta com ~35%', time: '16:00', icon: 'car', todo: 'Recarga opcional no shopping ao chegar — o trajeto fecha tranquilo.' },
      ],
    },
    {
      id: 'g4', cat: 'cultura', kicker: 'Cultura', selo: 2,
      title: 'Vila de Paranapiacaba', region: 'Santo André · SP',
      cover: 'vila inglesa na neblina', distance: 60, duration: '1h15', recharges: 0, season: 'Ano todo',
      blurb: 'Uma vila vitoriana na neblina, a 60 km — e dá para fazer com a carga do dia.',
      blurbLong: 'A antiga vila ferroviária inglesa parece um set de cinema quando a neblina sobe a serra. Trajeto curto e plano até Rio Grande da Serra, depois uma subida curtinha — saindo com 60% você faz ida e volta sem pensar em tomada.',
      tags: ['História', 'Neblina', 'Bate-volta'],
      stops: [
        { kind: 'start', name: 'São Paulo', sub: 'Saída pela Av. dos Estados', time: '09:00', todo: '' },
        { kind: 'stop', name: 'Vila de Paranapiacaba', sub: 'Manhã', time: '10:15', dur: '2 h', icon: 'camera', todo: 'O relógio inglês, o Castelinho e as casas vitorianas de madeira.' },
        { kind: 'stop', name: 'Trilha do Mirante', sub: 'Caminhada curta', dur: '2 h', icon: 'mountain', todo: 'Sobe até o mar de morros — leve agasalho, a neblina é traiçoeira.' },
        { kind: 'end', name: 'Café & volta', sub: 'Tarde', icon: 'coffee', todo: 'Chá da tarde no museu ferroviário antes de descer a serra.' },
      ],
    },
  ],
};
