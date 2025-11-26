const statusEl = document.getElementById("status");
const statusText = statusEl.querySelector(".status-text");

function setStatus(type, text) {
  statusEl.classList.remove("success", "error", "info");
  if (type) statusEl.classList.add(type);
  statusText.textContent = text;
}

let originalIcsText = null;
let originalFileName = "kalendarz.ics";
let eventsIndex = null; 

const fileInput = document.getElementById("fileInput");
const fileMeta = document.getElementById("fileMeta");

const yearsGrid = document.getElementById("yearsGrid");
const monthsGrid = document.getElementById("monthsGrid");

const btnYearsSelectAll = document.getElementById("btnYearsSelectAll");
const btnYearsClearAll = document.getElementById("btnYearsClearAll");
const btnMonthsSelectAll = document.getElementById("btnMonthsSelectAll");
const btnMonthsClearAll = document.getElementById("btnMonthsClearAll");

const btnPreview = document.getElementById("btnPreview");
const btnDownload = document.getElementById("btnDownload");

let yearButtons = [];
let monthButtons = [];

// nazwy miesięcy (do labeli)
const monthNames = [
  "styczeń", "luty", "marzec", "kwiecień",
  "maj", "czerwiec", "lipiec", "sierpień",
  "wrzesień", "październik", "listopad", "grudzień"
];

// render przycisków 
function renderYearButtons(years) {
  yearsGrid.classList.remove("placeholder");
  yearsGrid.innerHTML = "";
  yearButtons = [];

  if (!years.length) {
    yearsGrid.classList.add("placeholder");
    yearsGrid.innerHTML = '<span class="placeholder-text">Brak lat w danych VEVENT.</span>';
    return;
  }

  years.forEach((year) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill-btn year-btn";
    btn.dataset.year = String(year);
    btn.innerHTML = `<span class="num">${year}</span>`;

    btn.addEventListener("click", () => {
      btn.classList.toggle("selected");
    });

    yearsGrid.appendChild(btn);
    yearButtons.push(btn);
  });
}

function renderMonthButtons(months) {
  monthsGrid.classList.remove("placeholder");
  monthsGrid.innerHTML = "";
  monthButtons = [];

  if (!months.length) {
    monthsGrid.classList.add("placeholder");
    monthsGrid.innerHTML = '<span class="placeholder-text">Brak miesięcy w danych VEVENT.</span>';
    return;
  }

  months.forEach((month) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill-btn month-btn";
    btn.dataset.month = String(month);

    const labelName = monthNames[month - 1] || `miesiąc ${month}`;

    btn.innerHTML = `  <span class="num">${month}</span>
    <span class="name">${labelName}</span>`;


    btn.addEventListener("click", () => {
      btn.classList.toggle("selected");
    });

    monthsGrid.appendChild(btn);
    monthButtons.push(btn);
  });
}

function getSelectedYears() {
  return yearButtons
    .filter((btn) => btn.classList.contains("selected"))
    .map((btn) => Number(btn.dataset.year))
    .sort((a, b) => a - b);
}

function getSelectedMonths() {
  return monthButtons
    .filter((btn) => btn.classList.contains("selected"))
    .map((btn) => Number(btn.dataset.month))
    .sort((a, b) => a - b);
}

// select/clear
btnYearsSelectAll.addEventListener("click", () => {
  yearButtons.forEach((btn) => btn.classList.add("selected"));
});

btnYearsClearAll.addEventListener("click", () => {
  yearButtons.forEach((btn) => btn.classList.remove("selected"));
});

btnMonthsSelectAll.addEventListener("click", () => {
  monthButtons.forEach((btn) => btn.classList.add("selected"));
});

btnMonthsClearAll.addEventListener("click", () => {
  monthButtons.forEach((btn) => btn.classList.remove("selected"));
});

// parsowanie
function extractYearMonthFromEventLines(lines) {
  const dt = lines.find((l) => l.startsWith("DTSTART"));
  if (!dt) return null;

  const colonIndex = dt.lastIndexOf(":");
  if (colonIndex === -1) return null;

  const value = dt.slice(colonIndex + 1).trim();
  if (value.length < 8) return null; 

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));

  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;

  return { year, month };
}

// Skanujemy wszystkie VEVENT, wyciągamy listę lat, miesięcy i liczbę eventów
function scanEventsMeta(icsText) {
  const lines = icsText.split(/\r?\n/);
  let current = null;

  const yearsSet = new Set();
  const monthsSet = new Set();
  const countsByYearMonth = new Map();
  let total = 0;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = [line];
      continue;
    }

    if (line.startsWith("END:VEVENT")) {
      if (current) {
        current.push(line);
        const ym = extractYearMonthFromEventLines(current);
        if (ym) {
          yearsSet.add(ym.year);
          monthsSet.add(ym.month);
          const key = `${ym.year}-${String(ym.month).padStart(2, "0")}`;
          countsByYearMonth.set(key, (countsByYearMonth.get(key) || 0) + 1);
          total++;
        }
      }
      current = null;
      continue;
    }

    if (current) {
      current.push(line);
    }
  }

  const years = Array.from(yearsSet).sort((a, b) => a - b);
  const months = Array.from(monthsSet).sort((a, b) => a - b);

  return { years, months, countsByYearMonth, totalEvents: total };
}

// Filtrowanie VEVENT po latach i miesiącach
function filterEventsByYearMonth(icsText, allowedYears, allowedMonths) {
  const lines = icsText.split(/\r?\n/);

  const keptLines = [];
  let current = null;

  const yearsSet = new Set(allowedYears || []);
  const monthsSet = new Set(allowedMonths || []);

  const hasYearFilter = yearsSet.size > 0;
  const hasMonthFilter = monthsSet.size > 0;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      current = [line];
      continue;
    }

    if (line.startsWith("END:VEVENT")) {
      if (current) {
        current.push(line);
        const ym = extractYearMonthFromEventLines(current);

        let keep = true;

        if (!ym) {
          // jeśli nie ma poprawnego DTSTART – domyślnie wywalamy
          keep = false;
        } else {
          if (hasYearFilter && !yearsSet.has(ym.year)) keep = false;
          if (hasMonthFilter && !monthsSet.has(ym.month)) keep = false;
        }

        if (keep) {
          keptLines.push(...current);
        }
      }
      current = null;
      continue;
    }

    if (current) {
      current.push(line);
    } else {
      keptLines.push(line);
    }
  }

  return keptLines.join("\r\n");
}

// ładowanie pliku
fileInput.addEventListener("change", () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) {
    originalIcsText = null;
    originalFileName = "kalendarz.ics";
    eventsIndex = null;
    fileMeta.textContent = "";
    btnDownload.disabled = true;
    setStatus(null, "Załaduj plik .ics, potem wybierz lata i/lub miesiące.");
    yearsGrid.classList.add("placeholder");
    yearsGrid.innerHTML = '<span class="placeholder-text">Wczytaj plik, żeby zobaczyć dostępne lata.</span>';
    monthsGrid.classList.add("placeholder");
    monthsGrid.innerHTML = '<span class="placeholder-text">Wczytaj plik, żeby zobaczyć dostępne miesiące.</span>';
    yearButtons = [];
    monthButtons = [];
    return;
  }

  originalFileName = file.name || "kalendarz.ics";
  setStatus("info", "Wczytuję plik .ics...");

  const reader = new FileReader();
  reader.onload = (e) => {
    originalIcsText = String(e.target.result || "");
    eventsIndex = scanEventsMeta(originalIcsText);

    fileMeta.textContent = `${file.name} (${file.size} bajtów)`;

    renderYearButtons(eventsIndex.years);
    renderMonthButtons(eventsIndex.months);

    const yearsLabel = eventsIndex.years.length ? eventsIndex.years.join(", ") : "brak";
    const monthsLabel = eventsIndex.months.length
      ? eventsIndex.months.map((m) => monthNames[m - 1]).join(", ")
      : "brak";

    setStatus(
      "success",
      `Plik załadowany. Wykryto ${eventsIndex.totalEvents} wydarzeń: Lata: ${yearsLabel}; Miesiące: ${monthsLabel}.`
    );

    btnDownload.disabled = false;
  };

  reader.onerror = () => {
    originalIcsText = null;
    eventsIndex = null;
    btnDownload.disabled = true;
    setStatus("error", "Nie udało się odczytać pliku.");
  };

  reader.readAsText(file, "utf-8");
});

btnPreview.addEventListener("click", () => {
  if (!originalIcsText || !eventsIndex) {
    setStatus("error", "Najpierw wczytaj plik .ics.");
    return;
  }

  const selectedYears = getSelectedYears();
  const selectedMonths = getSelectedMonths();

  const { countsByYearMonth, totalEvents } = eventsIndex;

  let kept = 0;
  for (const [key, count] of countsByYearMonth.entries()) {
    const [yStr, mStr] = key.split("-");
    const year = Number(yStr);
    const month = Number(mStr);

    const yearOK =
      selectedYears.length === 0 || selectedYears.includes(year);
    const monthOK =
      selectedMonths.length === 0 || selectedMonths.includes(month);

    if (yearOK && monthOK) {
      kept += count;
    }
  }

  const yearsLabel = selectedYears.length
    ? selectedYears.join(", ")
    : "wszystkie lata";
  const monthsLabel = selectedMonths.length
    ? selectedMonths.map((m) => monthNames[m - 1]).join(", ")
    : "wszystkie miesiące";

  setStatus(
    "info",
    `Wczytanych wydarzeń: ${totalEvents}. Pozostanie: ${kept} (lata: ${yearsLabel}; miesiące: ${monthsLabel}).`
  );
});

// pobieranie
btnDownload.addEventListener("click", () => {
  if (!originalIcsText) {
    setStatus("error", "Najpierw wczytaj plik .ics.");
    return;
  }

  const selectedYears = getSelectedYears();
  const selectedMonths = getSelectedMonths();

  const filtered = filterEventsByYearMonth(
    originalIcsText,
    selectedYears,
    selectedMonths
  );

  const blob = new Blob([filtered], {
    type: "text/calendar;charset=utf-8",
  });

  const baseName = originalFileName.replace(/\.ics$/i, "");
  const yearPart =
    selectedYears.length > 0 ? `_y${selectedYears.join("-")}` : "_yALL";
  const monthPart =
    selectedMonths.length > 0 ? `_m${selectedMonths.join("-")}` : "_mALL";

  const defaultName = `${baseName}${yearPart}${monthPart}.ics`;

  // nazwa pliku
  const userFileName = prompt(
    "Podaj nazwę pliku do zapisania:",
    defaultName
  );

  if (!userFileName || !userFileName.trim()) {
    setStatus("info", "Pobieranie anulowane.");
    return;
  }

  const finalName = userFileName.endsWith(".ics")
    ? userFileName
    : userFileName + ".ics";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  setStatus("success", `Pobrano plik: ${finalName}`);

});
