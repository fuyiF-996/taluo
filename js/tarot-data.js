/**
 * ============================================================================
 * 韦特塔罗 78张完整牌组数据
 * ============================================================================
 * 
 * 数据结构说明：
 * - id:        唯一标识（大阿卡那 0-21，小阿卡那 以花色首字母+数字）
 * - name:      中文牌名
 * - nameEn:    英文牌名
 * - upright:   正位含义（简明解读）
 * - reversed:  逆位含义（简明解读）
 * - imageUrl:  牌面图片CDN地址（Wikipedia Rider-Waite 系列）
 * 
 * 图片源：Wikipedia Commons Rider-Waite Tarot Deck
 * 如图片加载失败，会在 CSS 中用渐变背景 + 文字作为 fallback
 * ============================================================================
 */

const TAROT_DECK = [

  /* ========================================================================
   *  大阿卡那 (Major Arcana) — 共 22 张，编号 0-21
   * ======================================================================== */

  {
    id: "M0",
    name: "愚者",
    nameEn: "The Fool",
    upright: "新的开始、冒险、天真、自由、无限可能",
    reversed: "鲁莽、冲动、逃避、天真过头、愚蠢的选择",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_00_Fool.jpg"
  },
  {
    id: "M1",
    name: "魔术师",
    nameEn: "The Magician",
    upright: "创造力、行动力、技能、意志、 manifestation（显化）",
    reversed: "欺骗、操控、技能未发挥、虚假的自信",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_01_Magician.jpg"
  },
  {
    id: "M2",
    name: "女祭司",
    nameEn: "The High Priestess",
    upright: "直觉、神秘、潜意识、智慧、内心声音",
    reversed: "秘密被揭露、忽视直觉、表面知识、困惑",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_02_High_Priestess.jpg"
  },
  {
    id: "M3",
    name: "皇后",
    nameEn: "The Empress",
    upright: "丰盛、母性、创造力、自然、爱与滋养",
    reversed: "依赖、停滞、过度保护、创造力受阻",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_03_Empress.jpg"
  },
  {
    id: "M4",
    name: "皇帝",
    nameEn: "The Emperor",
    upright: "权威、秩序、结构、稳定、领导",
    reversed: "独裁、僵化、缺乏纪律、权力滥用",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_04_Emperor.jpg"
  },
  {
    id: "M5",
    name: "教皇",
    nameEn: "The Hierophant",
    upright: "传统、信仰、教育、从众、精神导师",
    reversed: "反叛、打破常规、教条、挑战权威",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_05_Hierophant.jpg"
  },
  {
    id: "M6",
    name: "恋人",
    nameEn: "The Lovers",
    upright: "爱、和谐、关系、价值观选择、吸引力",
    reversed: "不和谐、失衡、错误选择、关系紧张",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/TheLovers.jpg"
  },
  {
    id: "M7",
    name: "战车",
    nameEn: "The Chariot",
    upright: "胜利、意志力、决心、前进、自我控制",
    reversed: "失控、无方向、攻击性、缺乏自律",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_07_Chariot.jpg"
  },
  {
    id: "M8",
    name: "力量",
    nameEn: "Strength",
    upright: "勇气、耐心、温柔的力量、同情心、内在力量",
    reversed: "自我怀疑、软弱、情绪失控、不安全感",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_08_Strength.jpg"
  },
  {
    id: "M9",
    name: "隐士",
    nameEn: "The Hermit",
    upright: "内省、独处、智慧、寻求真理、内在指引",
    reversed: "孤立、孤独、逃避现实、拒绝帮助",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_09_Hermit.jpg"
  },
  {
    id: "M10",
    name: "命运之轮",
    nameEn: "Wheel of Fortune",
    upright: "好运、机遇、循环、转折点、命运",
    reversed: "坏运、抵抗变化、僵局、控制欲",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_10_Wheel_of_Fortune.jpg"
  },
  {
    id: "M11",
    name: "正义",
    nameEn: "Justice",
    upright: "公正、真相、因果、平衡、法律",
    reversed: "不公、逃避责任、不诚实、失衡",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_11_Justice.jpg"
  },
  {
    id: "M12",
    name: "倒吊人",
    nameEn: "The Hanged Man",
    upright: "牺牲、新视角、等待、放手、感悟",
    reversed: "拖延、无谓牺牲、固执、抵抗改变",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_12_Hanged_Man.jpg"
  },
  {
    id: "M13",
    name: "死神",
    nameEn: "Death",
    upright: "结束、转化、重生、放下旧事物、蜕变",
    reversed: "抗拒结束、停滞不前、无法放下、害怕改变",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_13_Death.jpg"
  },
  {
    id: "M14",
    name: "节制",
    nameEn: "Temperance",
    upright: "平衡、耐心、中庸、融合、自我调节",
    reversed: "失衡、过度、冲突、缺乏远见",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_14_Temperance.jpg"
  },
  {
    id: "M15",
    name: "恶魔",
    nameEn: "The Devil",
    upright: "束缚、诱惑、物质主义、黑暗面、成瘾",
    reversed: "解脱、觉醒、打破枷锁、看清真相",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_15_Devil.jpg"
  },
  {
    id: "M16",
    name: "塔",
    nameEn: "The Tower",
    upright: "突变、崩塌、真相揭露、觉醒、释放",
    reversed: "避免灾难、恐惧变化、延迟崩溃、残留创伤",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_16_Tower.jpg"
  },
  {
    id: "M17",
    name: "星星",
    nameEn: "The Star",
    upright: "希望、灵感、平静、疗愈、精神指引",
    reversed: "失去信心、绝望、缺乏信任、理想破灭",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_17_Star.jpg"
  },
  {
    id: "M18",
    name: "月亮",
    nameEn: "The Moon",
    upright: "幻觉、潜意识、恐惧、直觉、神秘",
    reversed: "恐惧释放、真相浮现、减少困惑、克服焦虑",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_18_Moon.jpg"
  },
  {
    id: "M19",
    name: "太阳",
    nameEn: "The Sun",
    upright: "喜悦、成功、活力、积极、清晰",
    reversed: "暂时阴霾、过度乐观、内心阴暗、延迟成功",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_19_Sun.jpg"
  },
  {
    id: "M20",
    name: "审判",
    nameEn: "Judgement",
    upright: "觉醒、重生、召唤、宽恕、自我评估",
    reversed: "自我怀疑、拒绝召唤、无法原谅、迷失方向",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_20_Judgement.jpg"
  },
  {
    id: "M21",
    name: "世界",
    nameEn: "The World",
    upright: "完成、圆满、整合、旅行、成就",
    reversed: "未完成、缺乏闭合、延迟、空洞的成就",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_21_World.jpg"
  },

  /* ========================================================================
   *  小阿卡那 — 权杖 (Wands) 火元素，代表行动、热情、创造力
   * ======================================================================== */

  { id: "WA", name: "权杖首牌", nameEn: "Ace of Wands",
    upright: "新灵感、热情的开始、创造力涌现、能量爆发",
    reversed: "延迟、缺乏方向、热情减退、创意受阻",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands01.jpg" },
  { id: "W2", name: "权杖二", nameEn: "Two of Wands",
    upright: "规划、远见、选择、站在十字路口",
    reversed: "恐惧未知、规划受阻、犹豫、信息不足",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands02.jpg" },
  { id: "W3", name: "权杖三", nameEn: "Three of Wands",
    upright: "扩展、等待收获、远见、长途旅行",
    reversed: "预期延迟、挫折、计划落空、受阻",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands03.jpg" },
  { id: "W4", name: "权杖四", nameEn: "Four of Wands",
    upright: "庆祝、和谐、家的温暖、完成里程碑",
    reversed: "不稳定、缺乏和谐、庆祝被延迟",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands04.jpg" },
  { id: "W5", name: "权杖五", nameEn: "Five of Wands",
    upright: "竞争、冲突、争吵、不同意见",
    reversed: "避免冲突、内部和谐、释放紧张",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands05.jpg" },
  { id: "W6", name: "权杖六", nameEn: "Six of Wands",
    upright: "胜利、认可、公众成功、荣誉",
    reversed: "骄傲、失败、缺乏认可、他人嫉妒",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands06.jpg" },
  { id: "W7", name: "权杖七", nameEn: "Seven of Wands",
    upright: "坚守立场、勇气、坚持、防御",
    reversed: "放弃、准备不足、感到被压倒",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands07.jpg" },
  { id: "W8", name: "权杖八", nameEn: "Eight of Wands",
    upright: "快速行动、消息传来、旅行、进展顺利",
    reversed: "延迟、信息受阻、缓慢、停滞",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands08.jpg" },
  { id: "W9", name: "权杖九", nameEn: "Nine of Wands",
    upright: "韧性、最后一搏、疲惫但不屈、警觉",
    reversed: "筋疲力尽、偏执、接近放弃",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands09.jpg" },
  { id: "W10", name: "权杖十", nameEn: "Ten of Wands",
    upright: "负担过重、责任、坚持到最后",
    reversed: "释放负担、委托他人、疲惫不堪",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands10.jpg" },
  { id: "WP", name: "权杖侍从", nameEn: "Page of Wands",
    upright: "热情、新消息、探索、冒险精神",
    reversed: "延迟、缺乏方向、不成熟、坏消息",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands11.jpg" },
  { id: "WK", name: "权杖骑士", nameEn: "Knight of Wands",
    upright: "冲动、勇敢、冒险、追求热情",
    reversed: "鲁莽、缺乏耐心、不可靠、混乱",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands12.jpg" },
  { id: "WQ", name: "权杖王后", nameEn: "Queen of Wands",
    upright: "自信、有魅力、独立、热情洋溢",
    reversed: "嫉妒、嫉妒、自我中心、善变",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands13.jpg" },
  { id: "WW", name: "权杖国王", nameEn: "King of Wands",
    upright: "领导力、远见、创业精神、诚实",
    reversed: "冲动、专横、冲动、不切实际",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Wands14.jpg" },

  /* ========================================================================
   *  小阿卡那 — 圣杯 (Cups) 水元素，代表情感、关系、直觉
   * ======================================================================== */

  { id: "CA", name: "圣杯首牌", nameEn: "Ace of Cups",
    upright: "新感情、爱、直觉、情感新开始",
    reversed: "情感封闭、失落的爱、空虚、压抑",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups01.jpg" },
  { id: "C2", name: "圣杯二", nameEn: "Two of Cups",
    upright: "爱、结合、伙伴关系、相互吸引",
    reversed: "分离、失衡关系、破裂的协议",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups02.jpg" },
  { id: "C3", name: "圣杯三", nameEn: "Three of Cups",
    upright: "庆祝、友谊、社交、创意合作",
    reversed: "过度放纵、八卦、团队不和",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups03.jpg" },
  { id: "C4", name: "圣杯四", nameEn: "Four of Cups",
    upright: "厌倦、冷漠、沉思、错失机遇",
    reversed: "新机遇、觉醒、接受新事物",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups04.jpg" },
  { id: "C5", name: "圣杯五", nameEn: "Five of Cups",
    upright: "失落、悲伤、遗憾、失望",
    reversed: "接受、继续前进、找到希望",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups05.jpg" },
  { id: "C6", name: "圣杯六", nameEn: "Six of Cups",
    upright: "童年回忆、纯真、重逢、怀旧",
    reversed: "过度沉溺过去、停滞不前",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups06.jpg" },
  { id: "C7", name: "圣杯七", nameEn: "Seven of Cups",
    upright: "幻想、选择、想象力、白日梦",
    reversed: "清晰、做出选择、从幻想中回到现实",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups07.jpg" },
  { id: "C8", name: "圣杯八", nameEn: "Eight of Cups",
    upright: "放弃、寻找更深的意义、离开",
    reversed: "恐惧离开、犹豫、空虚感",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups08.jpg" },
  { id: "C9", name: "圣杯九", nameEn: "Nine of Cups",
    upright: "满足、愿望成真、情感满足",
    reversed: "未满足的渴望、物质主义、骄傲",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups09.jpg" },
  { id: "C10", name: "圣杯十", nameEn: "Ten of Cups",
    upright: "家庭幸福、情感圆满、和谐",
    reversed: "家庭冲突、破碎家庭、短暂的幸福",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups10.jpg" },
  { id: "CP", name: "圣杯侍从", nameEn: "Page of Cups",
    upright: "创意灵感、情感信息、敏感、好奇",
    reversed: "情绪化、不成熟的情感、坏消息",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups11.jpg" },
  { id: "CK", name: "圣杯骑士", nameEn: "Knight of Cups",
    upright: "浪漫、魅力、想象力、追求爱情",
    reversed: "情绪化、嫉妒、善变、不切实际",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups12.jpg" },
  { id: "CQ", name: "圣杯王后", nameEn: "Queen of Cups",
    upright: "富有同情心、直觉、情感成熟、慈悲",
    reversed: "情绪不稳定、依赖、情绪化",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups13.jpg" },
  { id: "CW", name: "圣杯国王", nameEn: "King of Cups",
    upright: "情感智慧、控制、外交、同情心",
    reversed: "情绪压抑、善 manipulative、情绪爆发",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Cups14.jpg" },

  /* ========================================================================
   *  小阿卡那 — 宝剑 (Swords) 风元素，代表思想、沟通、冲突
   * ======================================================================== */

  { id: "SA", name: "宝剑首牌", nameEn: "Ace of Swords",
    upright: "突破、新想法、清晰、真相揭露",
    reversed: "混乱、误解、残酷真相、冲突",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords01.jpg" },
  { id: "S2", name: "宝剑二", nameEn: "Two of Swords",
    upright: "僵局、犹豫、封锁、回避决策",
    reversed: "打破僵局、新信息、恢复平衡",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords02.jpg" },
  { id: "S3", name: "宝剑三", nameEn: "Three of Swords",
    upright: "心碎、悲伤、背叛、痛苦",
    reversed: "恢复、原谅、释放痛苦、治愈",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords03.jpg" },
  { id: "S4", name: "宝剑四", nameEn: "Four of Swords",
    upright: "休息、恢复、冥想、放松",
    reversed: "不安、过度工作、难以休息",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords04.jpg" },
  { id: "S5", name: "宝剑五", nameEn: "Five of Swords",
    upright: "冲突、失败、丢脸的胜利、紧张",
    reversed: "和解、放下冲突、原谅",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords05.jpg" },
  { id: "S6", name: "宝剑六", nameEn: "Six of Swords",
    upright: "过渡、迁徙、平和离开、寻求平静",
    reversed: "困难过渡、滞留、旧问题重现",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords06.jpg" },
  { id: "S7", name: "宝剑七", nameEn: "Seven of Swords",
    upright: "策略、偷偷摸摸、谎言、逃跑",
    reversed: "面对真相、揭露谎言、内疚",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords07.jpg" },
  { id: "S8", name: "宝剑八", nameEn: "Eight of Swords",
    upright: "困境、自我囚禁、受害者心态",
    reversed: "解放、找到出路、重新掌控",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords08.jpg" },
  { id: "S9", name: "宝剑九", nameEn: "Nine of Swords",
    upright: "焦虑、噩梦、恐惧、担忧",
    reversed: "恐惧消散、恢复信心、更积极的心态",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords09.jpg" },
  { id: "S10", name: "宝剑十", nameEn: "Ten of Swords",
    upright: "痛苦结束、结局、背叛、谷底",
    reversed: "艰难恢复、曙光、新开始",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords10.jpg" },
  { id: "SP", name: "宝剑侍从", nameEn: "Page of Swords",
    upright: "好奇心、警惕、新想法、学习",
    reversed: "八卦、冲动、缺乏方向、鲁莽",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords11.jpg" },
  { id: "SK", name: "宝剑骑士", nameEn: "Knight of Swords",
    upright: "决心、敏捷、雄心、直接",
    reversed: "冲动、鲁莽、攻击性、混乱",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords12.jpg" },
  { id: "SQ", name: "宝剑王后", nameEn: "Queen of Swords",
    upright: "独立、清晰、敏锐、诚实",
    reversed: "刻薄、残忍、冷漠、评判",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords13.jpg" },
  { id: "SW", name: "宝剑国王", nameEn: "King of Swords",
    upright: "权威、理性、道德、公正",
    reversed: "专制、冷酷、滥用权力、混乱",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Swords14.jpg" },

  /* ========================================================================
   *  小阿卡那 — 钱币 (Pentacles) 土元素，代表物质、金钱、实际
   * ======================================================================== */

  { id: "PA", name: "钱币首牌", nameEn: "Ace of Pentacles",
    upright: "新机遇、物质繁荣、稳定、种子",
    reversed: "机会错失、物质主义、缺乏规划",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents01.jpg" },
  { id: "P2", name: "钱币二", nameEn: "Two of Pentacles",
    upright: "平衡、灵活性、多任务处理、适应",
    reversed: "失衡、过载、混乱、无法应对",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents02.jpg" },
  { id: "P3", name: "钱币三", nameEn: "Three of Pentacles",
    upright: "团队合作、技能、工匠精神、协作",
    reversed: "团队不和、技能不足、缺乏协作",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents03.jpg" },
  { id: "P4", name: "钱币四", nameEn: "Four of Pentacles",
    upright: "财务安全、控制、保守、积累",
    reversed: "贪婪、吝啬、财务失控、不愿分享",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents04.jpg" },
  { id: "P5", name: "钱币五", nameEn: "Five of Pentacles",
    upright: "财务困难、物质匮乏、被排斥",
    reversed: "恢复、获得援助、从困难中走出",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents05.jpg" },
  { id: "P6", name: "钱币六", nameEn: "Six of Pentacles",
    upright: "给予、分享、慷慨、平衡的给予与接受",
    reversed: "债务、物质不平等、有条件的给予",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents06.jpg" },
  { id: "P7", name: "钱币七", nameEn: "Seven of Pentacles",
    upright: "耐心等待、评估回报、长期投资",
    reversed: "不耐烦、失望、过度关注回报",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents07.jpg" },
  { id: "P8", name: "钱币八", nameEn: "Eight of Pentacles",
    upright: "专注、技能学习、勤奋、质量",
    reversed: "完美主义、低质量工作、缺乏专注",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents08.jpg" },
  { id: "P9", name: "钱币九", nameEn: "Nine of Pentacles",
    upright: "独立、奢侈、自给自足、优雅",
    reversed: "财务依赖、物质上瘾、表面繁荣",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents09.jpg" },
  { id: "P10", name: "钱币十", nameEn: "Ten of Pentacles",
    upright: "家族财富、传承、稳定、长期成功",
    reversed: "财务失败、家庭冲突、不稳定",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents10.jpg" },
  { id: "PP", name: "钱币侍从", nameEn: "Page of Pentacles",
    upright: "学习、新机遇、耐心、实际想法",
    reversed: "缺乏进步、拖延、不切实际",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents11.jpg" },
  { id: "PK", name: "钱币骑士", nameEn: "Knight of Pentacles",
    upright: "可靠、稳定、勤奋、持之以恒",
    reversed: "无聊、固执、缺乏想象力、停滞",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents12.jpg" },
  { id: "PQ", name: "钱币王后", nameEn: "Queen of Pentacles",
    upright: "实际、滋养、安全、家庭、自然",
    reversed: "物质主义、忽视自我、财务依赖",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents13.jpg" },
  { id: "PW", name: "钱币国王", nameEn: "King of Pentacles",
    upright: "成功、领导力、财富、安全、慷慨",
    reversed: "物质主义、固执、财务失败、贪婪",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pents14.jpg" }

];

/**
 * 辅助函数：按类型获取牌组
 */
function getMajorArcana() {
  return TAROT_DECK.filter(card => card.id.startsWith('M'));
}

function getMinorArcana(suit) {
  // suit: 'W'权杖, 'C'圣杯, 'S'宝剑, 'P'钱币
  return TAROT_DECK.filter(card => card.id.startsWith(suit));
}

/**
 * 辅助函数：洗牌 (Fisher-Yates 算法)
 * @param {Array} deck - 牌堆数组
 * @returns {Array} 打乱后的牌堆
 */
function shuffleDeck(deck) {
  const newDeck = [...deck]; // 复制一份，不修改原数组
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

/**
 * 辅助函数：随机决定正/逆位
 * @returns {boolean} true=正位, false=逆位
 */
function randomOrientation() {
  return Math.random() > 0.5;
}

/**
 * 辅助函数：随机抽取指定数量的牌
 * @param {number} count - 抽取数量 (1 或 3)
 * @returns {Array} 抽中的牌数组，每张带 orientation 字段
 */
function drawCards(count) {
  const shuffled = shuffleDeck(TAROT_DECK);
  return shuffled.slice(0, count).map(card => ({
    ...card,
    orientation: randomOrientation() // true=正位, false=逆位
  }));
}

/**
 * 导出到全局作用域（因为不使用模块系统）
 * 在 app.js 中可直接使用 window.TAROT_DECK 或直接使用变量
 */
window.TAROT_DECK = TAROT_DECK;
window.getMajorArcana = getMajorArcana;
window.getMinorArcana = getMinorArcana;
window.shuffleDeck = shuffleDeck;
window.randomOrientation = randomOrientation;
window.drawCards = drawCards;
