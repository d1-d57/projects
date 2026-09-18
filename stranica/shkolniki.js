// Анкета школьника: заявка на проект. Монтируется на уже готовую разметку,
// которую нарисовал stranica/build.py, — скрипт ничего не строит сам.
// Самодостаточно: без сборщиков, без библиотек, чистый ES5.
//
// 🔴 СПИСКА ТЕМ ЗДЕСЬ НЕТ И БЫТЬ НЕ ДОЛЖНО. Единственный дом тем — temy.json;
// генератор превращает его в <optgroup>/<option>, а название темы и имя
// руководителя кладёт на сам <option> data-атрибутами. Скрипт их переписывает.
// Третья копия списка в коде — ровно тот дефект, из-за которого страница и
// источник уже расходились однажды молча.
(function () {
  "use strict";

  // Ключи заявки зацементированы вместе с ботом проектов (решение 18.09):
  // обе двери пишут в одну таблицу с одним form_id, и набор ключей — контракт.
  var PERENOS = { tema: "data-tema", rukovoditel: "data-rukovoditel" };

  function polya(form) {
    return form.querySelectorAll(".zayavka-vvod");
  }

  function sobratOtvety(form) {
    var otvety = { form_id: form.getAttribute("data-form-id") };
    var vse = polya(form);
    for (var i = 0; i < vse.length; i++) {
      otvety[vse[i].name] = (vse[i].value || "").trim();
    }
    // Название темы и руководитель едут вместе с id — иначе выгрузку заявок
    // нельзя прочитать, не держа рядом temy.json того же дня.
    var vybor = form.querySelector('select[name="tema_id"]');
    var punkt = vybor && vybor.selectedIndex >= 0 ? vybor.options[vybor.selectedIndex] : null;
    for (var klyuch in PERENOS) {
      if (!PERENOS.hasOwnProperty(klyuch)) continue;
      otvety[klyuch] = punkt ? punkt.getAttribute(PERENOS[klyuch]) || "" : "";
    }
    otvety.istochnik = "sajt";
    otvety.website = form.elements.website.value;
    return otvety;
  }

  function pometit(form, otvety) {
    var pervyjPloxoj = null;
    var vse = polya(form);
    for (var i = 0; i < vse.length; i++) {
      var vvod = vse[i];
      var obertka = vvod.closest(".zayavka-pole");
      var ploxo = vvod.required && !otvety[vvod.name];
      if (obertka) obertka.classList.toggle("zayavka-pole-ploxo", ploxo);
      if (ploxo && !pervyjPloxoj) pervyjPloxoj = vvod;
    }
    return pervyjPloxoj;
  }

  function sostoyanie(form, rod, tekst) {
    var status = form.querySelector(".zayavka-status");
    var knopka = form.querySelector(".zayavka-knopka");
    form.classList.remove("zayavka-form-otpravlyaetsya", "zayavka-form-otpravleno",
                          "zayavka-form-oshibka");
    if (rod) form.classList.add("zayavka-form-" + rod);
    knopka.disabled = rod === "otpravlyaetsya" || rod === "otpravleno";
    status.textContent = tekst || "";
    status.className = "zayavka-status" + (rod ? " zayavka-status-" + rod : "");
  }

  function soobshchenieOshibki(status) {
    if (status === 429) {
      return "Слишком много отправок подряд. Подождите минуту и попробуйте ещё раз";
    }
    if (status === 403) {
      return "Сервер не принял отправку с этой страницы (ошибка настройки, code 403). Напишите об этом — телеграм внизу страницы";
    }
    if (status >= 500) {
      return "Сервер не отвечает (ошибка " + status + "). Попробуйте позже или напишите нам";
    }
    return "Не удалось отправить (ошибка " + status + "). Попробуйте ещё раз или напишите нам";
  }

  function otpravit(form) {
    var otvety = sobratOtvety(form);
    var pervyjPloxoj = pometit(form, otvety);
    if (pervyjPloxoj) {
      sostoyanie(form, "oshibka", "Заполните отмеченные поля");
      pervyjPloxoj.focus();
      return;
    }
    sostoyanie(form, "otpravlyaetsya", "Отправляется…");
    fetch(form.getAttribute("data-otpravka"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(otvety),
    })
      .then(function (otvet) {
        if (!otvet.ok) throw new Error(soobshchenieOshibki(otvet.status));
        return otvet;
      })
      .then(function () {
        // Слова успеха выбирает владелец, и живут они в одном месте — в разметке,
        // которую пишет генератор. Скрипт их не повторяет, а читает.
        sostoyanie(form, "otpravleno", form.getAttribute("data-uspeh"));
      })
      .catch(function (oshibka) {
        var tekst = oshibka && oshibka.message
          ? oshibka.message
          : "Не удалось отправить: нет связи с сервером";
        if (oshibka instanceof TypeError) {
          tekst = "Не удалось отправить: нет связи с сервером. Проверьте интернет и попробуйте ещё раз";
        }
        sostoyanie(form, "oshibka", tekst);
      });
  }

  function podklyuchit(koren) {
    var otkryt = koren.querySelector(".zayavka-otkryt");
    var panel = koren.querySelector(".zayavka-panel");
    var zakryt = koren.querySelector(".zayavka-krestik");
    var form = koren.querySelector(".zayavka-form");
    if (!otkryt || !panel || !form) return;

    function pokazat(vidno) {
      panel.hidden = !vidno;
      otkryt.setAttribute("aria-expanded", vidno ? "true" : "false");
      koren.classList.toggle("zayavka-otkryta", vidno);
      if (!vidno) return;
      var pervoe = form.querySelector(".zayavka-vvod");
      if (pervoe) pervoe.focus();
    }

    otkryt.addEventListener("click", function () { pokazat(panel.hidden); });
    if (zakryt) {
      zakryt.addEventListener("click", function () { pokazat(false); otkryt.focus(); });
    }
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Escape" || e.key === "Esc") && !panel.hidden) {
        pokazat(false);
        otkryt.focus();
      }
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      otpravit(form);
    });
  }

  function smontirovat() {
    // Копий разметки на странице две — десктопная и мобильная; видима всегда одна.
    var korni = document.querySelectorAll(".zayavka");
    for (var i = 0; i < korni.length; i++) podklyuchit(korni[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", smontirovat);
  } else {
    smontirovat();
  }
})();
