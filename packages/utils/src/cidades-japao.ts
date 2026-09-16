// Lista local de cidades do Japão para autocomplete do campo "cidade onde mora".
//
// Escopo deliberado: cobre as principais cidades (shi) de todas as 47 províncias,
// com mais densidade nas regiões com grande comunidade brasileira (Aichi, Shizuoka,
// Gunma, Mie, Gifu, Ibaraki, Nagano) — inclui também Ōizumi e Ōra (Gunma), que são
// municípios (machi) e não cidades, por serem polos históricos de dekassegui.
// Não é uma lista exaustiva de todos os ~1.700 municípios do Japão: é só a base de
// sugestões do autocomplete. O campo continua aceitando texto livre — se a cidade do
// visitante não estiver aqui, ele digita normalmente e o cadastro segue igual.
//
// Fonte única compartilhada entre web e mobile — ver docs/cadastro-evento-especificacao.md.

export interface CidadeJapao {
  cidade: string
  provincia: string
}

export const CIDADES_JAPAO: CidadeJapao[] = [
  // Hokkaido
  { cidade: 'Sapporo', provincia: 'Hokkaido' },
  { cidade: 'Hakodate', provincia: 'Hokkaido' },
  { cidade: 'Asahikawa', provincia: 'Hokkaido' },
  { cidade: 'Kushiro', provincia: 'Hokkaido' },
  { cidade: 'Obihiro', provincia: 'Hokkaido' },
  { cidade: 'Kitami', provincia: 'Hokkaido' },
  { cidade: 'Tomakomai', provincia: 'Hokkaido' },
  { cidade: 'Otaru', provincia: 'Hokkaido' },
  { cidade: 'Muroran', provincia: 'Hokkaido' },
  { cidade: 'Chitose', provincia: 'Hokkaido' },
  // Aomori
  { cidade: 'Aomori', provincia: 'Aomori' },
  { cidade: 'Hachinohe', provincia: 'Aomori' },
  { cidade: 'Hirosaki', provincia: 'Aomori' },
  { cidade: 'Towada', provincia: 'Aomori' },
  // Iwate
  { cidade: 'Morioka', provincia: 'Iwate' },
  { cidade: 'Ichinoseki', provincia: 'Iwate' },
  { cidade: 'Kitakami', provincia: 'Iwate' },
  { cidade: 'Hanamaki', provincia: 'Iwate' },
  { cidade: 'Ofunato', provincia: 'Iwate' },
  // Miyagi
  { cidade: 'Sendai', provincia: 'Miyagi' },
  { cidade: 'Ishinomaki', provincia: 'Miyagi' },
  { cidade: 'Osaki', provincia: 'Miyagi' },
  { cidade: 'Tome', provincia: 'Miyagi' },
  { cidade: 'Natori', provincia: 'Miyagi' },
  // Akita
  { cidade: 'Akita', provincia: 'Akita' },
  { cidade: 'Yokote', provincia: 'Akita' },
  { cidade: 'Odate', provincia: 'Akita' },
  { cidade: 'Daisen', provincia: 'Akita' },
  // Yamagata
  { cidade: 'Yamagata', provincia: 'Yamagata' },
  { cidade: 'Tsuruoka', provincia: 'Yamagata' },
  { cidade: 'Sakata', provincia: 'Yamagata' },
  { cidade: 'Yonezawa', provincia: 'Yamagata' },
  // Fukushima
  { cidade: 'Fukushima', provincia: 'Fukushima' },
  { cidade: 'Koriyama', provincia: 'Fukushima' },
  { cidade: 'Iwaki', provincia: 'Fukushima' },
  { cidade: 'Aizuwakamatsu', provincia: 'Fukushima' },
  { cidade: 'Sukagawa', provincia: 'Fukushima' },
  // Ibaraki
  { cidade: 'Mito', provincia: 'Ibaraki' },
  { cidade: 'Tsukuba', provincia: 'Ibaraki' },
  { cidade: 'Hitachi', provincia: 'Ibaraki' },
  { cidade: 'Hitachinaka', provincia: 'Ibaraki' },
  { cidade: 'Tsuchiura', provincia: 'Ibaraki' },
  { cidade: 'Koga', provincia: 'Ibaraki' },
  { cidade: 'Tokai', provincia: 'Ibaraki' },
  { cidade: 'Naka', provincia: 'Ibaraki' },
  { cidade: 'Bando', provincia: 'Ibaraki' },
  { cidade: 'Joso', provincia: 'Ibaraki' },
  { cidade: 'Kasama', provincia: 'Ibaraki' },
  { cidade: 'Ryugasaki', provincia: 'Ibaraki' },
  { cidade: 'Moriya', provincia: 'Ibaraki' },
  { cidade: 'Inashiki', provincia: 'Ibaraki' },
  { cidade: 'Omitama', provincia: 'Ibaraki' },
  // Tochigi
  { cidade: 'Utsunomiya', provincia: 'Tochigi' },
  { cidade: 'Oyama', provincia: 'Tochigi' },
  { cidade: 'Ashikaga', provincia: 'Tochigi' },
  { cidade: 'Sano', provincia: 'Tochigi' },
  { cidade: 'Tochigi', provincia: 'Tochigi' },
  { cidade: 'Nasushiobara', provincia: 'Tochigi' },
  { cidade: 'Mooka', provincia: 'Tochigi' },
  { cidade: 'Kanuma', provincia: 'Tochigi' },
  { cidade: 'Nikko', provincia: 'Tochigi' },
  { cidade: 'Yaita', provincia: 'Tochigi' },
  // Gunma
  { cidade: 'Maebashi', provincia: 'Gunma' },
  { cidade: 'Takasaki', provincia: 'Gunma' },
  { cidade: 'Ota', provincia: 'Gunma' },
  { cidade: 'Isesaki', provincia: 'Gunma' },
  { cidade: 'Kiryu', provincia: 'Gunma' },
  { cidade: 'Fujioka', provincia: 'Gunma' },
  { cidade: 'Tatebayashi', provincia: 'Gunma' },
  { cidade: 'Shibukawa', provincia: 'Gunma' },
  { cidade: 'Numata', provincia: 'Gunma' },
  { cidade: 'Oizumi', provincia: 'Gunma' },
  { cidade: 'Ora', provincia: 'Gunma' },
  // Saitama
  { cidade: 'Saitama', provincia: 'Saitama' },
  { cidade: 'Kawaguchi', provincia: 'Saitama' },
  { cidade: 'Kawagoe', provincia: 'Saitama' },
  { cidade: 'Tokorozawa', provincia: 'Saitama' },
  { cidade: 'Koshigaya', provincia: 'Saitama' },
  { cidade: 'Kumagaya', provincia: 'Saitama' },
  { cidade: 'Fukaya', provincia: 'Saitama' },
  { cidade: 'Honjo', provincia: 'Saitama' },
  { cidade: 'Kasukabe', provincia: 'Saitama' },
  { cidade: 'Soka', provincia: 'Saitama' },
  { cidade: 'Ageo', provincia: 'Saitama' },
  { cidade: 'Higashimatsuyama', provincia: 'Saitama' },
  { cidade: 'Kuki', provincia: 'Saitama' },
  { cidade: 'Konosu', provincia: 'Saitama' },
  { cidade: 'Warabi', provincia: 'Saitama' },
  // Chiba
  { cidade: 'Chiba', provincia: 'Chiba' },
  { cidade: 'Funabashi', provincia: 'Chiba' },
  { cidade: 'Matsudo', provincia: 'Chiba' },
  { cidade: 'Ichikawa', provincia: 'Chiba' },
  { cidade: 'Kashiwa', provincia: 'Chiba' },
  { cidade: 'Narashino', provincia: 'Chiba' },
  { cidade: 'Narita', provincia: 'Chiba' },
  { cidade: 'Sakura', provincia: 'Chiba' },
  { cidade: 'Noda', provincia: 'Chiba' },
  { cidade: 'Isumi', provincia: 'Chiba' },
  // Tokyo
  { cidade: 'Tokyo', provincia: 'Tokyo' },
  { cidade: 'Hachioji', provincia: 'Tokyo' },
  { cidade: 'Machida', provincia: 'Tokyo' },
  { cidade: 'Fuchu', provincia: 'Tokyo' },
  { cidade: 'Chofu', provincia: 'Tokyo' },
  { cidade: 'Koganei', provincia: 'Tokyo' },
  { cidade: 'Musashino', provincia: 'Tokyo' },
  { cidade: 'Tachikawa', provincia: 'Tokyo' },
  { cidade: 'Ome', provincia: 'Tokyo' },
  // Kanagawa
  { cidade: 'Yokohama', provincia: 'Kanagawa' },
  { cidade: 'Kawasaki', provincia: 'Kanagawa' },
  { cidade: 'Sagamihara', provincia: 'Kanagawa' },
  { cidade: 'Yokosuka', provincia: 'Kanagawa' },
  { cidade: 'Hiratsuka', provincia: 'Kanagawa' },
  { cidade: 'Fujisawa', provincia: 'Kanagawa' },
  { cidade: 'Odawara', provincia: 'Kanagawa' },
  { cidade: 'Atsugi', provincia: 'Kanagawa' },
  { cidade: 'Ebina', provincia: 'Kanagawa' },
  { cidade: 'Yamato', provincia: 'Kanagawa' },
  { cidade: 'Chigasaki', provincia: 'Kanagawa' },
  { cidade: 'Zama', provincia: 'Kanagawa' },
  // Niigata
  { cidade: 'Niigata', provincia: 'Niigata' },
  { cidade: 'Nagaoka', provincia: 'Niigata' },
  { cidade: 'Joetsu', provincia: 'Niigata' },
  { cidade: 'Kashiwazaki', provincia: 'Niigata' },
  { cidade: 'Sanjo', provincia: 'Niigata' },
  { cidade: 'Shibata', provincia: 'Niigata' },
  // Toyama
  { cidade: 'Toyama', provincia: 'Toyama' },
  { cidade: 'Takaoka', provincia: 'Toyama' },
  { cidade: 'Imizu', provincia: 'Toyama' },
  { cidade: 'Namerikawa', provincia: 'Toyama' },
  // Ishikawa
  { cidade: 'Kanazawa', provincia: 'Ishikawa' },
  { cidade: 'Komatsu', provincia: 'Ishikawa' },
  { cidade: 'Hakusan', provincia: 'Ishikawa' },
  { cidade: 'Kaga', provincia: 'Ishikawa' },
  // Fukui
  { cidade: 'Fukui', provincia: 'Fukui' },
  { cidade: 'Sabae', provincia: 'Fukui' },
  { cidade: 'Echizen', provincia: 'Fukui' },
  // Yamanashi
  { cidade: 'Kofu', provincia: 'Yamanashi' },
  { cidade: 'Kai', provincia: 'Yamanashi' },
  { cidade: 'Fuefuki', provincia: 'Yamanashi' },
  // Nagano
  { cidade: 'Nagano', provincia: 'Nagano' },
  { cidade: 'Matsumoto', provincia: 'Nagano' },
  { cidade: 'Ueda', provincia: 'Nagano' },
  { cidade: 'Iida', provincia: 'Nagano' },
  { cidade: 'Ina', provincia: 'Nagano' },
  { cidade: 'Suwa', provincia: 'Nagano' },
  { cidade: 'Okaya', provincia: 'Nagano' },
  { cidade: 'Saku', provincia: 'Nagano' },
  { cidade: 'Chino', provincia: 'Nagano' },
  { cidade: 'Komoro', provincia: 'Nagano' },
  // Gifu
  { cidade: 'Gifu', provincia: 'Gifu' },
  { cidade: 'Ogaki', provincia: 'Gifu' },
  { cidade: 'Kakamigahara', provincia: 'Gifu' },
  { cidade: 'Tajimi', provincia: 'Gifu' },
  { cidade: 'Minokamo', provincia: 'Gifu' },
  { cidade: 'Kani', provincia: 'Gifu' },
  { cidade: 'Seki', provincia: 'Gifu' },
  { cidade: 'Mizunami', provincia: 'Gifu' },
  { cidade: 'Toki', provincia: 'Gifu' },
  { cidade: 'Hashima', provincia: 'Gifu' },
  { cidade: 'Yoro', provincia: 'Gifu' },
  // Shizuoka
  { cidade: 'Shizuoka', provincia: 'Shizuoka' },
  { cidade: 'Hamamatsu', provincia: 'Shizuoka' },
  { cidade: 'Fuji', provincia: 'Shizuoka' },
  { cidade: 'Numazu', provincia: 'Shizuoka' },
  { cidade: 'Iwata', provincia: 'Shizuoka' },
  { cidade: 'Fukuroi', provincia: 'Shizuoka' },
  { cidade: 'Kakegawa', provincia: 'Shizuoka' },
  { cidade: 'Kosai', provincia: 'Shizuoka' },
  { cidade: 'Yaizu', provincia: 'Shizuoka' },
  { cidade: 'Fujieda', provincia: 'Shizuoka' },
  { cidade: 'Shimada', provincia: 'Shizuoka' },
  { cidade: 'Gotemba', provincia: 'Shizuoka' },
  { cidade: 'Mishima', provincia: 'Shizuoka' },
  { cidade: 'Fujinomiya', provincia: 'Shizuoka' },
  { cidade: 'Makinohara', provincia: 'Shizuoka' },
  { cidade: 'Hamakita', provincia: 'Shizuoka' },
  // Aichi
  { cidade: 'Nagoya', provincia: 'Aichi' },
  { cidade: 'Toyota', provincia: 'Aichi' },
  { cidade: 'Okazaki', provincia: 'Aichi' },
  { cidade: 'Ichinomiya', provincia: 'Aichi' },
  { cidade: 'Toyohashi', provincia: 'Aichi' },
  { cidade: 'Anjo', provincia: 'Aichi' },
  { cidade: 'Kariya', provincia: 'Aichi' },
  { cidade: 'Komaki', provincia: 'Aichi' },
  { cidade: 'Handa', provincia: 'Aichi' },
  { cidade: 'Kasugai', provincia: 'Aichi' },
  { cidade: 'Konan', provincia: 'Aichi' },
  { cidade: 'Chiryu', provincia: 'Aichi' },
  { cidade: 'Nishio', provincia: 'Aichi' },
  { cidade: 'Inazawa', provincia: 'Aichi' },
  { cidade: 'Toyokawa', provincia: 'Aichi' },
  { cidade: 'Seto', provincia: 'Aichi' },
  { cidade: 'Owariasahi', provincia: 'Aichi' },
  { cidade: 'Obu', provincia: 'Aichi' },
  { cidade: 'Chita', provincia: 'Aichi' },
  { cidade: 'Tokoname', provincia: 'Aichi' },
  { cidade: 'Tsushima', provincia: 'Aichi' },
  { cidade: 'Hekinan', provincia: 'Aichi' },
  { cidade: 'Gamagori', provincia: 'Aichi' },
  { cidade: 'Shinshiro', provincia: 'Aichi' },
  // Mie
  { cidade: 'Tsu', provincia: 'Mie' },
  { cidade: 'Yokkaichi', provincia: 'Mie' },
  { cidade: 'Suzuka', provincia: 'Mie' },
  { cidade: 'Matsusaka', provincia: 'Mie' },
  { cidade: 'Kameyama', provincia: 'Mie' },
  { cidade: 'Iga', provincia: 'Mie' },
  { cidade: 'Ise', provincia: 'Mie' },
  { cidade: 'Kuwana', provincia: 'Mie' },
  { cidade: 'Nabari', provincia: 'Mie' },
  { cidade: 'Toba', provincia: 'Mie' },
  // Shiga
  { cidade: 'Otsu', provincia: 'Shiga' },
  { cidade: 'Kusatsu', provincia: 'Shiga' },
  { cidade: 'Moriyama', provincia: 'Shiga' },
  { cidade: 'Hikone', provincia: 'Shiga' },
  { cidade: 'Nagahama', provincia: 'Shiga' },
  { cidade: 'Koka', provincia: 'Shiga' },
  { cidade: 'Konan', provincia: 'Shiga' },
  { cidade: 'Higashiomi', provincia: 'Shiga' },
  { cidade: 'Ritto', provincia: 'Shiga' },
  // Kyoto
  { cidade: 'Kyoto', provincia: 'Kyoto' },
  { cidade: 'Uji', provincia: 'Kyoto' },
  { cidade: 'Kameoka', provincia: 'Kyoto' },
  { cidade: 'Joyo', provincia: 'Kyoto' },
  { cidade: 'Kyotanabe', provincia: 'Kyoto' },
  // Osaka
  { cidade: 'Osaka', provincia: 'Osaka' },
  { cidade: 'Sakai', provincia: 'Osaka' },
  { cidade: 'Higashiosaka', provincia: 'Osaka' },
  { cidade: 'Toyonaka', provincia: 'Osaka' },
  { cidade: 'Suita', provincia: 'Osaka' },
  { cidade: 'Hirakata', provincia: 'Osaka' },
  { cidade: 'Takatsuki', provincia: 'Osaka' },
  { cidade: 'Yao', provincia: 'Osaka' },
  { cidade: 'Ibaraki', provincia: 'Osaka' },
  { cidade: 'Neyagawa', provincia: 'Osaka' },
  { cidade: 'Izumi', provincia: 'Osaka' },
  { cidade: 'Kishiwada', provincia: 'Osaka' },
  // Hyogo
  { cidade: 'Kobe', provincia: 'Hyogo' },
  { cidade: 'Himeji', provincia: 'Hyogo' },
  { cidade: 'Nishinomiya', provincia: 'Hyogo' },
  { cidade: 'Amagasaki', provincia: 'Hyogo' },
  { cidade: 'Akashi', provincia: 'Hyogo' },
  { cidade: 'Kakogawa', provincia: 'Hyogo' },
  { cidade: 'Takarazuka', provincia: 'Hyogo' },
  { cidade: 'Itami', provincia: 'Hyogo' },
  { cidade: 'Kawanishi', provincia: 'Hyogo' },
  // Nara
  { cidade: 'Nara', provincia: 'Nara' },
  { cidade: 'Kashihara', provincia: 'Nara' },
  { cidade: 'Yamatokoriyama', provincia: 'Nara' },
  { cidade: 'Ikoma', provincia: 'Nara' },
  // Wakayama
  { cidade: 'Wakayama', provincia: 'Wakayama' },
  { cidade: 'Tanabe', provincia: 'Wakayama' },
  { cidade: 'Kainan', provincia: 'Wakayama' },
  { cidade: 'Hashimoto', provincia: 'Wakayama' },
  // Tottori
  { cidade: 'Tottori', provincia: 'Tottori' },
  { cidade: 'Yonago', provincia: 'Tottori' },
  { cidade: 'Kurayoshi', provincia: 'Tottori' },
  // Shimane
  { cidade: 'Matsue', provincia: 'Shimane' },
  { cidade: 'Izumo', provincia: 'Shimane' },
  { cidade: 'Hamada', provincia: 'Shimane' },
  // Okayama
  { cidade: 'Okayama', provincia: 'Okayama' },
  { cidade: 'Kurashiki', provincia: 'Okayama' },
  { cidade: 'Tsuyama', provincia: 'Okayama' },
  { cidade: 'Soja', provincia: 'Okayama' },
  // Hiroshima
  { cidade: 'Hiroshima', provincia: 'Hiroshima' },
  { cidade: 'Fukuyama', provincia: 'Hiroshima' },
  { cidade: 'Kure', provincia: 'Hiroshima' },
  { cidade: 'Higashihiroshima', provincia: 'Hiroshima' },
  { cidade: 'Onomichi', provincia: 'Hiroshima' },
  // Yamaguchi
  { cidade: 'Yamaguchi', provincia: 'Yamaguchi' },
  { cidade: 'Shimonoseki', provincia: 'Yamaguchi' },
  { cidade: 'Ube', provincia: 'Yamaguchi' },
  { cidade: 'Shunan', provincia: 'Yamaguchi' },
  { cidade: 'Iwakuni', provincia: 'Yamaguchi' },
  // Tokushima
  { cidade: 'Tokushima', provincia: 'Tokushima' },
  { cidade: 'Naruto', provincia: 'Tokushima' },
  { cidade: 'Anan', provincia: 'Tokushima' },
  // Kagawa
  { cidade: 'Takamatsu', provincia: 'Kagawa' },
  { cidade: 'Marugame', provincia: 'Kagawa' },
  { cidade: 'Sakaide', provincia: 'Kagawa' },
  // Ehime
  { cidade: 'Matsuyama', provincia: 'Ehime' },
  { cidade: 'Imabari', provincia: 'Ehime' },
  { cidade: 'Niihama', provincia: 'Ehime' },
  { cidade: 'Saijo', provincia: 'Ehime' },
  // Kochi
  { cidade: 'Kochi', provincia: 'Kochi' },
  { cidade: 'Nankoku', provincia: 'Kochi' },
  // Fukuoka
  { cidade: 'Fukuoka', provincia: 'Fukuoka' },
  { cidade: 'Kitakyushu', provincia: 'Fukuoka' },
  { cidade: 'Kurume', provincia: 'Fukuoka' },
  { cidade: 'Omuta', provincia: 'Fukuoka' },
  { cidade: 'Iizuka', provincia: 'Fukuoka' },
  // Saga
  { cidade: 'Saga', provincia: 'Saga' },
  { cidade: 'Karatsu', provincia: 'Saga' },
  { cidade: 'Tosu', provincia: 'Saga' },
  // Nagasaki
  { cidade: 'Nagasaki', provincia: 'Nagasaki' },
  { cidade: 'Sasebo', provincia: 'Nagasaki' },
  { cidade: 'Isahaya', provincia: 'Nagasaki' },
  // Kumamoto
  { cidade: 'Kumamoto', provincia: 'Kumamoto' },
  { cidade: 'Yatsushiro', provincia: 'Kumamoto' },
  { cidade: 'Arao', provincia: 'Kumamoto' },
  // Oita
  { cidade: 'Oita', provincia: 'Oita' },
  { cidade: 'Beppu', provincia: 'Oita' },
  { cidade: 'Nakatsu', provincia: 'Oita' },
  // Miyazaki
  { cidade: 'Miyazaki', provincia: 'Miyazaki' },
  { cidade: 'Nobeoka', provincia: 'Miyazaki' },
  { cidade: 'Miyakonojo', provincia: 'Miyazaki' },
  // Kagoshima
  { cidade: 'Kagoshima', provincia: 'Kagoshima' },
  { cidade: 'Kanoya', provincia: 'Kagoshima' },
  { cidade: 'Kirishima', provincia: 'Kagoshima' },
  // Okinawa
  { cidade: 'Naha', provincia: 'Okinawa' },
  { cidade: 'Okinawa', provincia: 'Okinawa' },
  { cidade: 'Uruma', provincia: 'Okinawa' },
  { cidade: 'Urasoe', provincia: 'Okinawa' },
  { cidade: 'Ginowan', provincia: 'Okinawa' },
]

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/** Busca cidades pelo prefixo/trecho digitado — usada pelo autocomplete do cadastro. */
export function searchCidadesJapao(query: string, limit = 8): CidadeJapao[] {
  const q = normalize(query)
  if (q.length < 2) return []
  return CIDADES_JAPAO.filter((c) => normalize(c.cidade).includes(q)).slice(0, limit)
}
