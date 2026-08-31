// Анкета для научных руководителей: монтируется в #anketa, шлёт POST на Worker.
// Самодостаточно: без сборщиков, без библиотек. Всё именование — под префиксом anketa-.
// Элемент #anketa на странице создаёт ВЁРСТКА; нет элемента — скрипт молча ничего не делает.
(function () {
  "use strict";

  var ANKETA_ENDPOINT = "https://ankety-worker.ankety.workers.dev/submit";
  var ANKETA_FORM_ID = "nauchruki-2026";

  // Состав полей — из stranica/content.md, раздел «Анкета». Ключи латиницей:
  // именно они станут field_key в базе, их читает владелец через wrangler d1 execute.
  var ANKETA_POLYA = [
    {
      key: "imya",
      label: "Имя",
      type: "text",
      required: true,
      autocomplete: "name",
    },
    {
      key: "kto_vy",
      label: "Кто вы",
      type: "radio",
      required: true,
      options: [
        "исследователь",
        "преподаватель",
        "аспирант или магистрант",
        "студент",
      ],
    },
    {
      key: "mesto",
      label: "Место работы или учёбы",
      type: "text",
      required: true,
    },
    {
      key: "kontakt",
      label: "Контакт",
      type: "text",
      required: true,
      hint: "Почта или телеграм — куда ответить",
    },
    {
      key: "tema",
      label: "Тема одной строкой",
      type: "text",
      required: true,
    },
    // Множественный выбор, а не «сколько школьников готовы взять»: у задачи бывает
    // и то и другое устройство сразу, и тогда отмечаются оба пункта (решение владельца 30.08).
    {
      key: "format",
      label: "Как можно работать над задачей",
      type: "flazhki",
      required: true,
      options: ["в одиночку", "группой"],
      hint: "Можно отметить оба",
    },
    {
      key: "kto_vedet",
      label: "Кто ведёт",
      type: "radio",
      required: true,
      options: ["веду сам", "веду вместе со своим учеником"],
    },
    {
      key: "o_chem_zadacha",
      label: "О чём задача",
      type: "textarea",
      required: true,
      hint: "Какой объект и что про него хочется понять, примерно три-пять предложений",
    },
  ];

  // Галочки самопроверки. Не обязательны и ничего не блокируют: это самодиагностика
  // подающего, а не наша модерация. В базу уходят все четыре, «да» или «нет».
  var ANKETA_GALOCHKI = [
    {
      key: "samocheck_minimalnyj_rezultat",
      label:
        "Понимаю, как выглядит минимальный результат, который школьник получит к зиме",
    },
    {
      key: "samocheck_uprazhneniya",
      label:
        "Могу сформулировать 5–10 упражнений по теме и понимаю, как к ответу идти",
    },
    {
      key: "samocheck_otkrytyj_vopros",
      label: "В задаче есть вопрос, ответа на который я не знаю",
    },
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function polyaId(key, suffix) {
    return "anketa-pole-" + key + (suffix ? "-" + suffix : "");
  }

  function narisovatTextovoe(pole) {
    var obertka = el("div", "anketa-pole");
    var podpis = el("label", "anketa-podpis", pole.label);
    podpis.setAttribute("for", polyaId(pole.key));
    if (pole.required) podpis.appendChild(el("span", "anketa-zvezda", " *"));
    obertka.appendChild(podpis);

    if (pole.hint) obertka.appendChild(el("div", "anketa-hint", pole.hint));

    var vvod =
      pole.type === "textarea"
        ? el("textarea", "anketa-vvod anketa-vvod-mnogostrochnyj")
        : el("input", "anketa-vvod");
    if (pole.type !== "textarea") vvod.type = "text";
    else vvod.rows = 5;
    vvod.id = polyaId(pole.key);
    vvod.name = pole.key;
    if (pole.required) vvod.required = true;
    if (pole.autocomplete) vvod.autocomplete = pole.autocomplete;
    obertka.appendChild(vvod);
    obertka.appendChild(el("div", "anketa-oshibka-polya"));
    return obertka;
  }

  // Один рисователь на оба выбора: radio — «ровно один», flazhki — «один или оба».
  // Разница только в типе input; вид, подпись и место ошибки общие.
  function narisovatVybor(pole) {
    var mnogo = pole.type === "flazhki";
    var obertka = el("fieldset", "anketa-pole anketa-pole-vybor");
    var podpis = el("legend", "anketa-podpis", pole.label);
    if (pole.required) podpis.appendChild(el("span", "anketa-zvezda", " *"));
    obertka.appendChild(podpis);
    if (pole.hint) obertka.appendChild(el("div", "anketa-hint", pole.hint));

    var ryad = el("div", "anketa-varianty");
    pole.options.forEach(function (option, i) {
      var id = polyaId(pole.key, String(i));
      var punkt = el("label", "anketa-variant");
      punkt.setAttribute("for", id);
      var vvod = el("input", mnogo ? "anketa-checkbox" : "anketa-radio");
      vvod.type = mnogo ? "checkbox" : "radio";
      vvod.id = id;
      vvod.name = pole.key;
      vvod.value = option;
      punkt.appendChild(vvod);
      punkt.appendChild(el("span", "anketa-variant-tekst", option));
      ryad.appendChild(punkt);
    });
    obertka.appendChild(ryad);
    obertka.appendChild(el("div", "anketa-oshibka-polya"));
    return obertka;
  }

  function narisovatGalochki() {
    var obertka = el("fieldset", "anketa-pole anketa-pole-galochki");
    obertka.appendChild(el("legend", "anketa-podpis", "Самопроверка"));
    obertka.appendChild(
      el(
        "div",
        "anketa-hint",
        "Не обязательно и ни на что не влияет: это для вас, а не для нас"
      )
    );
    ANKETA_GALOCHKI.forEach(function (galochka, i) {
      var id = polyaId(galochka.key, String(i));
      var punkt = el("label", "anketa-galochka");
      punkt.setAttribute("for", id);
      var vvod = el("input", "anketa-checkbox");
      vvod.type = "checkbox";
      vvod.id = id;
      vvod.name = galochka.key;
      punkt.appendChild(vvod);
      punkt.appendChild(el("span", "anketa-galochka-tekst", galochka.label));
      obertka.appendChild(punkt);
    });
    return obertka;
  }

  function narisovatPrimanku() {
    // Поле-приманка. Имя website Worker уже знает — не переименовывать.
    // Прячем уводом за экран, а не display:none: часть ботов заполняет только видимое в DOM.
    var obertka = el("div", "anketa-primanka");
    obertka.setAttribute("aria-hidden", "true");
    var podpis = el("label", null, "Не заполняйте это поле");
    podpis.setAttribute("for", polyaId("website"));
    var vvod = el("input");
    vvod.type = "text";
    vvod.id = polyaId("website");
    vvod.name = "website";
    vvod.tabIndex = -1;
    vvod.autocomplete = "off";
    obertka.appendChild(podpis);
    obertka.appendChild(vvod);
    return obertka;
  }

  function sobratForm() {
    var form = el("form", "anketa-form");
    form.noValidate = true; // ошибки показываем сами, одинаково во всех браузерах

    ANKETA_POLYA.forEach(function (pole) {
      form.appendChild(
        pole.type === "radio" || pole.type === "flazhki"
          ? narisovatVybor(pole)
          : narisovatTextovoe(pole)
      );
    });
    form.appendChild(narisovatGalochki());
    form.appendChild(narisovatPrimanku());

    var nizhnij = el("div", "anketa-niz");
    var knopka = el("button", "anketa-knopka", "Отправить");
    knopka.type = "submit";
    nizhnij.appendChild(knopka);
    form.appendChild(nizhnij);

    var status = el("div", "anketa-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.appendChild(status);

    return form;
  }

  function sobratOtvety(form) {
    var otvety = { form_id: ANKETA_FORM_ID };

    ANKETA_POLYA.forEach(function (pole) {
      if (pole.type === "flazhki") {
        // Отмеченные варианты уходят одной строкой через запятую: колонка в базе
        // остаётся текстовой, как у всех прочих полей, и читается тем же запросом.
        var vse = form.querySelectorAll('input[name="' + pole.key + '"]:checked');
        var znacheniya = [];
        for (var i = 0; i < vse.length; i++) znacheniya.push(vse[i].value);
        otvety[pole.key] = znacheniya.join(", ");
      } else if (pole.type === "radio") {
        var vybran = form.querySelector('input[name="' + pole.key + '"]:checked');
        otvety[pole.key] = vybran ? vybran.value : "";
      } else {
        otvety[pole.key] = form.elements[pole.key].value.trim();
      }
    });

    ANKETA_GALOCHKI.forEach(function (galochka) {
      otvety[galochka.key] = form.elements[galochka.key].checked ? "да" : "нет";
    });

    otvety.website = form.elements.website.value;
    return otvety;
  }

  function proverit(form, otvety) {
    var pervyjPloxoj = null;

    ANKETA_POLYA.forEach(function (pole) {
      var obertka =
        pole.type === "radio" || pole.type === "flazhki"
          ? form.querySelector('input[name="' + pole.key + '"]').closest(".anketa-pole")
          : form.elements[pole.key].closest(".anketa-pole");
      var mesto = obertka.querySelector(".anketa-oshibka-polya");
      var pusto = pole.required && !otvety[pole.key];
      obertka.classList.toggle("anketa-pole-ploxoe", pusto);
      mesto.textContent = pusto ? "Без этого не отправить" : "";
      if (pusto && !pervyjPloxoj) pervyjPloxoj = obertka;
    });

    return pervyjPloxoj;
  }

  function soobshchenieOshibki(status, telo) {
    // Ошибку называем словами: молчаливого провала быть не должно.
    if (status === 429) {
      return "Слишком часто: с этого адреса анкету уже отправляли минуту назад. Подождите минуту и нажмите ещё раз";
    }
    if (status === 403) {
      return "Сервер не принял отправку с этой страницы (ошибка настройки, code 403). Напишите об этом — почта и телеграм на странице";
    }
    if (telo && telo.error === "form_id required") {
      return "Отправка ушла без имени анкеты — это ошибка страницы, а не ваша. Напишите нам";
    }
    if (status >= 500) {
      return "Сервер анкеты не отвечает (ошибка " + status + "). Попробуйте позже или напишите нам";
    }
    return "Не удалось отправить (ошибка " + status + "). Попробуйте ещё раз или напишите нам";
  }

  function ustanovitSostoyanie(form, sostoyanie, tekst) {
    var status = form.querySelector(".anketa-status");
    var knopka = form.querySelector(".anketa-knopka");
    form.classList.remove(
      "anketa-form-otpravlyaetsya",
      "anketa-form-otpravleno",
      "anketa-form-oshibka"
    );
    if (sostoyanie) form.classList.add("anketa-form-" + sostoyanie);
    knopka.disabled = sostoyanie === "otpravlyaetsya" || sostoyanie === "otpravleno";
    status.textContent = tekst || "";
    status.className =
      "anketa-status" + (sostoyanie ? " anketa-status-" + sostoyanie : "");
  }

  function otpravit(form) {
    var otvety = sobratOtvety(form);
    var pervyjPloxoj = proverit(form, otvety);
    if (pervyjPloxoj) {
      ustanovitSostoyanie(form, "oshibka", "Заполните отмеченные поля");
      var vvod = pervyjPloxoj.querySelector("input, textarea");
      if (vvod) vvod.focus();
      return;
    }

    ustanovitSostoyanie(form, "otpravlyaetsya", "Отправляется…");

    fetch(ANKETA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(otvety),
    })
      .then(function (otvet) {
        return otvet
          .json()
          .catch(function () {
            return null;
          })
          .then(function (telo) {
            if (!otvet.ok) {
              throw new Error(soobshchenieOshibki(otvet.status, telo));
            }
            return telo;
          });
      })
      .then(function () {
        ustanovitSostoyanie(
          form,
          "otpravleno",
          "Отправлено. Спасибо — ответим на указанный контакт"
        );
      })
      .catch(function (oshibka) {
        var tekst =
          oshibka && oshibka.message
            ? oshibka.message
            : "Не удалось отправить: нет связи с сервером анкеты";
        if (oshibka instanceof TypeError) {
          tekst =
            "Не удалось отправить: нет связи с сервером анкеты. Проверьте интернет и попробуйте ещё раз";
        }
        ustanovitSostoyanie(form, "oshibka", tekst);
      });
  }

  function smontirovat() {
    var mesto = document.getElementById("anketa");
    if (!mesto) return; // элемента нет — молча ничего не делаем, в консоль не ругаемся
    if (mesto.querySelector(".anketa-root")) return;

    var koren = el("div", "anketa-root");
    var form = sobratForm();
    form.addEventListener("submit", function (sobytie) {
      sobytie.preventDefault();
      otpravit(form);
    });
    koren.appendChild(form);
    mesto.appendChild(koren);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", smontirovat);
  } else {
    smontirovat();
  }
})();
