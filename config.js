/* =========================================================
   НАСТРОЙКИ «Метр за метром» — правьте только этот файл
   ========================================================= */
window.APP_CONFIG = {
  appName: "Метр за метром",

  // Бот будет создан позже — пока пусто.
  botUsername: "Metr_design_bot",

  // Кнопка «Хочу расчёт»:
  //  "manager"     — открыть чат с менеджером с готовым текстом (по умолчанию)
  //  "bot"         — открыть бота по ссылке ?start=calc_<id> (когда появится бот)
  //  "placeholder" — только уведомление, ничего не открывать
  leadMode: "manager",

  // Telegram-username менеджера без @
  managerTelegram: "Izhorec",

  // Текст сообщения. {name} заменяется названием ЖК.
  leadTextTemplate: "Здравствуйте! Хочу расчёт по ЖК {name}",

  // Задел под сервер заявок (не используется)
  leadEndpoint: "",

  defaultCity: "spb",
  cities: {
    spb: { title: "Санкт-Петербург и Ленобласть", short: "СПб и ЛО", regions: ["spb", "lo"], center: [59.94, 30.31], zoom: 10 },
    msk: { title: "Москва и Подмосковье", short: "Москва и МО", regions: ["msk", "mo"], center: [55.751, 37.618], zoom: 10 }
  },

  // ---------------- КАРТА ----------------
  // Векторная схема OpenFreeMap (без ключа), светлый и тёмный стиль переключаются с темой.
  map: {
    light: "https://tiles.openfreemap.org/styles/positron",
    dark: "https://tiles.openfreemap.org/styles/dark",
    // Одна строка атрибуции. Упоминание OpenStreetMap обязательно по лицензии ODbL.
    attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a>'
  }
};
