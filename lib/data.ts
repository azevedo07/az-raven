import {
  Project,
  Scene,
  QualityCategory,
  PlatformStrategy,
} from "./types";

/**
 * Camada de dados do Raven Studio.
 * Hoje retorna dados mockados em memória; na Sprint 1 estas funções
 * devem ser substituídas por chamadas reais à API (Raven Core),
 * mantendo a mesma assinatura para os componentes não precisarem mudar.
 */

export const projects: Project[] = [
  {
    id: "o-corvo",
    name: "O Corvo — Edição Cinematográfica",
    autor: "Edgar Allan Poe",
    idioma: "PT-BR",
    status: "andamento",
    statusLabel: "Em produção",
    progress: 64,
    tempo: "05:00",
    paletteFrom: "#0B0D10",
    paletteTo: "#3a2a12",
    scenesCount: 6,
    lastEdited: "há 12 minutos",
    objective: "Traduzir o luto e a loucura crescente do narrador em linguagem puramente visual.",
  },
  {
    id: "anabel-lee",
    name: "Anabel Lee — Curta Poético",
    autor: "Edgar Allan Poe",
    idioma: "PT-BR",
    status: "revisao",
    statusLabel: "Em revisão",
    progress: 38,
    tempo: "03:20",
    paletteFrom: "#10131a",
    paletteTo: "#242b37",
    scenesCount: 4,
    lastEdited: "há 3 horas",
    objective: "Retratar o amor eterno de Anabel Lee como uma memória que resiste ao tempo e à morte.",
  },
  {
    id: "sonata-meia-noite",
    name: "Sonata da Meia-Noite",
    autor: "Roteiro original AZ",
    idioma: "PT-BR",
    status: "andamento",
    statusLabel: "Em produção",
    progress: 22,
    tempo: "04:10",
    paletteFrom: "#151A22",
    paletteTo: "#2a2115",
    scenesCount: 5,
    lastEdited: "há 1 dia",
    objective: "Explorar insônia e memória através de uma peça audiovisual original.",
  },
  {
    id: "retrato-oval",
    name: "O Retrato Oval — Ensaio Visual",
    autor: "Edgar Allan Poe",
    idioma: "EN",
    status: "concluido",
    statusLabel: "Concluído",
    progress: 100,
    tempo: "02:45",
    paletteFrom: "#202733",
    paletteTo: "#1a1420",
    scenesCount: 3,
    lastEdited: "há 2 semanas",
    objective: "Ensaio fotográfico sobre a obsessão artística e o retrato que rouba a vida.",
  },
  {
    id: "ligeia",
    name: "Ligeia — Estudo de Atmosfera",
    autor: "Edgar Allan Poe",
    idioma: "PT-BR",
    status: "concluido",
    statusLabel: "Concluído",
    progress: 100,
    tempo: "01:55",
    paletteFrom: "#0d1014",
    paletteTo: "#3a2a12",
    scenesCount: 2,
    lastEdited: "há 1 mês",
    objective: "Testes de iluminação e paleta para uma futura produção sobre Ligeia.",
  },
  {
    id: "mascara-morte-rubra",
    name: "A Máscara da Morte Rubra",
    autor: "Edgar Allan Poe",
    idioma: "PT-BR",
    status: "revisao",
    statusLabel: "Em revisão",
    progress: 15,
    tempo: "06:30",
    paletteFrom: "#0B0D10",
    paletteTo: "#1a1420",
    scenesCount: 7,
    lastEdited: "há 5 dias",
    objective: "Levantamento de referências visuais para a alegoria da peste inevitável.",
  },
];

export function getProjectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export const scenes: Scene[] = [
  {
    n: 1,
    title: "Meia-noite tenebrosa",
    emo: "Solidão contemplativa",
    narr: "Estabelecer o luto e a fadiga do narrador",
    tempo: "00:00–00:45",
    duracao: "45s",
    som: "Vento fraco, relógio ao longe",
    luz: "Luz de vela, sombras longas",
    cam: "Plano fixo, leve zoom-in",
    paleta: ["#0B0D10", "#3a2a12", "#1a1420"],
    status: "aprovado",
    criterio: "Silêncio deve ser sentido antes de qualquer corte",
  },
  {
    n: 2,
    title: "A batida na porta",
    emo: "Sobressalto, tensão",
    narr: "Introduzir o mistério que rompe o silêncio",
    tempo: "00:45–01:30",
    duracao: "45s",
    som: "Batida seca, silêncio tenso",
    luz: "Contraluz frio do corredor",
    cam: "Dolly-in lento até a porta",
    paleta: ["#10131a", "#242b37", "#D4AF37"],
    status: "aprovado",
    criterio: "A porta vazia precisa gerar alívio falso, não só susto",
  },
  {
    n: 3,
    title: "A janela se abre",
    emo: "Surpresa, presságio",
    narr: "O corvo entra no espaço do narrador",
    tempo: "01:30–02:10",
    duracao: "40s",
    som: "Rangido, bater de asas",
    luz: "Chiaroscuro, vela como luz-chave",
    cam: "Steadicam acompanhando o voo",
    paleta: ["#0B0D10", "#1a1420", "#D4AF37"],
    status: "em revisão",
    criterio: "O voo precisa parecer real, não coreografado",
  },
  {
    n: 4,
    title: "O pouso no busto de Palas",
    emo: "Estranhamento",
    narr: "O corvo se estabelece como presença permanente",
    tempo: "02:10–02:50",
    duracao: "40s",
    som: "Silêncio quase absoluto",
    luz: "Spot dourado sobre o busto",
    cam: "Plano fechado, leve crane-down",
    paleta: ["#202733", "#D4AF37", "#0B0D10"],
    status: "aprovado",
    criterio: "O corvo deve parecer definitivo, não passageiro",
  },
  {
    n: 5,
    title: "O interrogatório",
    emo: "Curiosidade tornando-se aflição",
    narr: "O narrador tenta decifrar a ave",
    tempo: "02:50–04:00",
    duracao: "70s",
    som: "Voz sussurrada, eco leve",
    luz: "Luz de vela oscilante",
    cam: "Shot-reverse-shot íntimo",
    paleta: ["#151A22", "#3a2a12", "#AAB2BF"],
    status: "em revisão",
    criterio: "Repetição da resposta precisa crescer em peso, não em volume",
  },
  {
    n: 6,
    title: "“Nunca mais” final",
    emo: "Desespero absoluto",
    narr: "Colapso emocional do narrador",
    tempo: "04:00–05:00",
    duracao: "60s",
    som: "Respiração pesada, silêncio final",
    luz: "Escurecimento progressivo até quase-preto",
    cam: "Zoom-out lento, isolando a figura",
    paleta: ["#0B0D10", "#0d1014", "#E0605A"],
    status: "pendente",
    criterio: "O corte final precisa deixar o público sem resolução",
  },
];

export const characters = [
  {
    name: "O Narrador",
    role: "Protagonista",
    objetivo: "Encontrar alívio racional para o luto",
    conflito: "Razão vs. desespero crescente",
    personalidade: "Intelectual, isolado, orgulhoso da própria lucidez",
    estadoEmocional: "De cansaço contido a colapso total",
    transformacao: "De cético a subjugado pela repetição",
    linguagemCorporal: "Rígido no início, cada vez mais encolhido",
    tomDeVoz: "Grave, controlada, quebrando no clímax",
    visual: "Roupas de estudo escuras, cabelo desalinhado ao fim",
  },
  {
    name: "O Corvo",
    role: "Presença catalisadora",
    objetivo: "Nunca definido — ambiguidade é o ponto",
    conflito: "Ser interpretado como presságio ou acaso",
    personalidade: "Imóvel, indiferente, quase arquitetônico",
    estadoEmocional: "Nenhuma — funciona como espelho do narrador",
    transformacao: "Não muda; é o mundo ao redor que muda",
    linguagemCorporal: "Postura fixa sobre o busto, cabeça levemente inclinada",
    tomDeVoz: "Uma única palavra, sempre no mesmo tom",
    visual: "Plumagem negra fosca, contraste absoluto com o dourado do busto",
  },
  {
    name: "Lenora",
    role: "Ausência estruturante",
    objetivo: "Nunca aparece — é pura memória",
    conflito: "Existir apenas como lembrança dolorosa",
    personalidade: "Inferida como luminosa, gentil, idealizada",
    estadoEmocional: "Nostalgia e perda, nunca presença direta",
    transformacao: "Não se transforma — é o vazio que não muda",
    linguagemCorporal: "Nunca visualizada em cena",
    tomDeVoz: "Nunca ouvida",
    visual: "Presença só implícita — luz suave em memórias fugazes",
  },
];

export const worldBible = [
  { label: "Local", value: "Quarto de estudos isolado, no andar superior de uma casa antiga" },
  { label: "Época", value: "Ambientação atemporal de inspiração gótica, sensação de século XIX" },
  { label: "Clima", value: "Inverno rigoroso, vento constante do lado de fora" },
  { label: "Arquitetura", value: "Interiores vitorianos — madeira escura, tetos altos, portas pesadas" },
  { label: "Objetos-chave", value: "Livros antigos, busto de Palas Atena, lareira quase apagada, cortina púrpura" },
  { label: "Cores dominantes", value: "Preto, dourado velho, roxo profundo, toques de vermelho no clímax" },
  { label: "Luz", value: "Uma única vela como fonte principal; contraluz frio na janela" },
  { label: "Sons", value: "Vento, madeira rangendo, silêncio como elemento ativo" },
  { label: "Texturas", value: "Veludo desgastado, mármore frio, penas foscas" },
  { label: "Referências cinematográficas", value: "Sleepy Hollow, The Others, Crimson Peak" },
];

// `getPipelineModules` NÃO é mais re-exportado por este arquivo — ver
// nota de arquitetura no topo de `lib/pipeline-core/store.ts`. Este
// arquivo (`lib/data.ts`) é importado por Client Components (ex.:
// `app/audience-intelligence/page.tsx`); manter o Pipeline Core (que
// depende de Prisma/`pg`, código exclusivo de servidor) fora do grafo de
// import deste arquivo evita vazar módulos Node-only para o bundle do
// navegador.

export const promptCategories: { key: string; label: string; code: string }[] = [
  {
    key: "imagem",
    label: "Imagem",
    code: `cena: quarto vitoriano, meia-noite, janela aberta
sujeito: corvo negro pousando sobre busto de Palas Atena
iluminação: luz de vela única, alto contraste, chiaroscuro
paleta: preto profundo, dourado velho, roxo escuro
lente: 35mm, profundidade de campo rasa
estilo: pintura gótica cinematográfica, grão de filme 35mm`,
  },
  {
    key: "video",
    label: "Vídeo",
    code: `movimento: dolly-in lento até steadicam acompanhando o corvo
ação: corvo atravessa a janela em voo baixo e pousa no busto
câmera: 24fps, motion blur natural, sem cortes bruscos
duração: 8 segundos contínuos`,
  },
  {
    key: "audio",
    label: "Áudio",
    code: `camada 1: vento fraco e contínuo ao fundo
camada 2: bater de asas único e súbito
camada 3: rangido leve da janela abrindo
camada 4: silêncio tenso após o pouso (2s)`,
  },
  {
    key: "narracao",
    label: "Narração",
    code: `voz: masculina, grave, tom introspectivo e cansado
ritmo: pausado, com hesitação entre versos
direção: sussurrar as últimas palavras de cada verso`,
  },
  {
    key: "trilha",
    label: "Trilha",
    code: `instrumentação: piano solo, cordas graves esparsas
tom: menor, dissonância sutil
tempo: 58 bpm, rubato
duração sugerida: 45 segundos, crescendo no pouso do corvo`,
  },
];

export const qualityAudit: QualityCategory[] = [
  { name: "Narrativa", note: "Estrutura fiel ao poema, arco de tensão sem quedas de coerência entre as 6 cenas.", score: 9.4 },
  { name: "Emoção", note: "Curva do Emotion Engine respeitada em cada decisão de câmera e ritmo de corte.", score: 9.5 },
  { name: "Fotografia", note: "Uso consistente de chiaroscuro; paleta preto/dourado mantida em todas as cenas.", score: 9.1 },
  { name: "Continuidade", note: "Pequena inconsistência na intensidade da vela entre as cenas 01 e 05.", score: 8.2 },
  { name: "Ritmo", note: "Cena 05 ligeiramente mais longa que o ideal.", score: 8.4 },
  { name: "Iluminação", note: "Uso da vela como única fonte é coerente e bem executado em todas as cenas.", score: 9.3 },
  { name: "Direção", note: "Justificativas do Director Engine seguidas com precisão na execução de cada cena.", score: 9.2 },
  { name: "Identidade visual", note: "Paleta, tipografia e composição alinhadas ao Brand System da AZ do início ao fim.", score: 9.6 },
  { name: "Áudio", note: "Trilha e ambiência coerentes; narração poderia ganhar mais variação na cena 5.", score: 8.5 },
  { name: "Experiência geral", note: "Assistir do início ao fim entrega a sensação de desgaste psicológico pretendida.", score: 9.3 },
];

export const platformStrategies: Record<string, PlatformStrategy> = {
  youtube: {
    label: "YouTube",
    rows: [
      ["Títulos", '"O Corvo: o clássico de Poe ganha vida" · "Nunca Mais — uma adaptação de O Corvo"'],
      ["Descrição", "Uma adaptação cinematográfica de \"O Corvo\", de Edgar Allan Poe."],
      ["Palavras-chave", "Edgar Allan Poe, O Corvo, literatura gótica, terror psicológico"],
      ["Abertura (hook)", '"Ele só queria esquecer. O corvo não deixou."'],
      ["CTA", "Inscreva-se para a próxima adaptação de Poe"],
    ],
  },
  shorts: {
    label: "YouTube Shorts",
    rows: [
      ["Melhor trecho", "Cena 06 — colapso final, isolado"],
      ["Duração ideal", "45–58s"],
      ["Legenda", '"Ele pediu pra ir embora. A resposta foi sempre a mesma."'],
      ["Título", '"A palavra que não muda"'],
      ["CTA", "Filme completo no canal — link no perfil"],
    ],
  },
  tiktok: {
    label: "TikTok",
    rows: [
      ["Melhor trecho", "Cena 03 — entrada do corvo, alto choque visual"],
      ["Abertura", "A janela se abrindo sozinha, sem corte"],
      ["Legenda", '"Isso é uma adaptação de IA de um poema de 1845"'],
      ["Hashtags", "#OCorvo #EdgarAllanPoe #Literatura #CurtaDeIA"],
      ["CTA natural", '"Filme completo no YouTube — link na bio"'],
    ],
  },
  instagram: {
    label: "Instagram Reels",
    rows: [
      ["Reel", "Cena 04 — o pouso, visualmente mais rica"],
      ["Abertura", "Corte direto no momento em que o corvo pousa"],
      ["Legenda", '"Alguns lutos não aceitam ser esquecidos."'],
      ["CTA", "Assista ao filme completo — link na bio"],
    ],
  },
};

export const thumbnailConcepts = [
  { title: "NUNCA MAIS", from: "#0B0D10", to: "#1a1420", emotion: "Inquietação", note: "Close no olho do corvo · vela lateral · tipografia serifada dourada." },
  { title: "O QUE BATEU NA PORTA?", from: "#10131a", to: "#242b37", emotion: "Mistério", note: "Silhueta do narrador contra a porta · contraluz frio · tipografia fina." },
  { title: "ELE NÃO VAI EMBORA", from: "#202733", to: "#3a2a12", emotion: "Majestade sombria", note: "Busto com o corvo no ponto áureo · spot dourado · tipografia grande." },
];

export const exportPlatforms = [
  { name: "YouTube", spec: "16:9 · até 5min · Master Quality" },
  { name: "Arquivo Master", spec: "ProRes 4K · sem compressão" },
  { name: "Instagram Reels", spec: "9:16 · até 90s · corte editado" },
  { name: "TikTok", spec: "9:16 · até 60s · legendas embutidas" },
  { name: "Instagram Feed", spec: "1:1 ou 4:5 · trecho de destaque" },
  { name: "YouTube Shorts", spec: "9:16 · até 60s · gancho nos 3s iniciais" },
];

export const publicationChecklist = [
  { label: "Vídeo pronto", done: true },
  { label: "Thumbnail pronta", done: true },
  { label: "Descrição", done: true },
  { label: "Capítulos", done: true },
  { label: "Hashtags", done: true },
  { label: "Título", done: true },
  { label: "Exportação", done: true },
  { label: "Revisão final (aguardando aprovação humana)", done: false },
];
