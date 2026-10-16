# Чужой код и данные в этом приложении

## hanzpo/kcal — адаптивный расход энергии, правила разбора фото еды
https://github.com/hanzpo/kcal (коммит 9ed3ead, 07.10.2026)
- `coach.js`: `computeWeightTrend`, `computeExpenditure` — порт `src/services/coaching.ts` (строки 14–203).
- `food.js`: правила в `PHOTO_Q` — перевод части `SYSTEM_PROMPT` из `src/services/ai.ts` (строки 99–107).

```
MIT License

Copyright (c) 2026 Hanz Po

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## SKR18156592/IronTrack — рекорд на подходе
https://github.com/SKR18156592/IronTrack (коммит c3dba08, 08.10.2026)
- `program.js`: `epley`, `compareSet` — порт `epley1RM` (`src/model.js:50–52`) и `compareSet` (`src/performance.js:55–64`).
- `program.js`: `perfEntry` (рекорд без разминки), `counted` (прогрессия без разминки и дропов) — правила `workingSets` (`src/performance.js:13–17`) и `COUNTED` (`src/performance.js:92`).

```
MIT License

Copyright (c) 2026 Suman Kumar Raj

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.```

## USDA FoodData Central — справочник продуктов
`food_ru.json`, сухие крупы в `food.js`: ккал и белок на 100 г из FoodData Central, U.S. Department of Agriculture,
Agricultural Research Service — fdc.nal.usda.gov. Наборы SR Legacy (04.2018) и Branded Foods; данные опубликованы как
общественное достояние (CC0 1.0). Номер карточки — поле `fdc`: https://fdc.nal.usda.gov/food-details/<fdc>/nutrients.
Русские названия и подбор соответствий — наши.

## Программа тренировок
Greg Nuckols Beginner Program, вариант Strength — бесплатная программа Грега Наколса (Stronger By Science) в Boostcamp:
boostcamp.app/coaches/greg-nuckols/greg-nuckols-beginner-program. Из неё взяты состав тренировок A-B-C-D, диапазоны повторов
и правило прибавки веса; кода и текстов Boostcamp в приложении нет. Good Morning заменён на румынскую тягу — замена самого автора.

## Механики без чужого кода
Колонка «было» в строке подхода, шапка «время · объём · подходы», экран итога — по публичному описанию Hevy
(hevyapp.com/features), код свой. Колонка «цель» в строке подхода — по скрину Boostcamp в App Store (Target), код свой. Таймер, черновик тренировки — свои.

## AndreiBautin/LiftOS — детектор застоя
https://github.com/AndreiBautin/LiftOS (коммит d2e86aa, 09.10.2026)
- `program.js`: `versus`, `topSet`, `stalledFor`, `isStalled`, `resetKg`, `STALL_SESSIONS`, `RESET_SHARE`, `FATIGUE_STALLS`, `RECENT_DAYS` — порт `src/domain/logging/versus-last.ts` (строки 35–64, 102–104) и `src/domain/programs/stall.ts` (строки 25–62, 99–102).

```
MIT License

Copyright (c) 2026 Andrei Bautin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Everkinetic — рисунки техники (app/tech/*.png)

Источник: https://github.com/everkinetic/data (dist/png, src/images-web), «Open data project based on http://everkinetic.com created by Greg Priday».
Лицензия: Creative Commons Attribution-ShareAlike 4.0 International (LICENSE.md репозитория) — https://creativecommons.org/licenses/by-sa/4.0/
Изменения: уменьшены до 480 px, прозрачность заменена белым фоном, палитра 32 цвета. Изменённые файлы распространяются под той же лицензией CC BY-SA 4.0.
Атрибуция показывается в приложении под рисунками («Рисунки: Everkinetic (Greg Priday), CC BY-SA 4.0»).

## free-exercise-db — тексты подсказок (app/technique.js)

Источник: https://github.com/yuhonas/free-exercise-db (dist/exercises.json, поле instructions). Лицензия: Unlicense (public domain). Подсказки — вольный пересказ по-русски.

## wger — рисунки техники для 6 упражнений (app/tech/csrow-0.jpg, twist-0.jpg, ohp-0.jpg, goblet-0|1.jpg, shpress-0|1.png, hipthrust-0.jpg)

Источник: https://wger.de, API /api/v2/exerciseimage/ (id 459 — автор carlos3c, упражнение 1283; id 426 — lion, 1193; id 371 — Franpol, 418; id 518 — автор не указан, 203, gif → 2 кадра; id 195, 196 — автор wger.de, упражнение 543 «Shoulder Press, on Machine», license 1 = CC BY-SA 3.0 https://creativecommons.org/licenses/by-sa/3.0/; id 582 — AlucardEvil40, 1642 «Dumbbell Hip Thrust», webp → jpg).
Лицензия по API: license 2 (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/). Изменения: уменьшены, фон белый, JPEG. Распространяются под той же лицензией; атрибуция показана под рисунком в приложении.

Everkinetic (11.10, программа v3): incdbbench ← dist/png/0080, latraise ← 0018, legext ← 0142, facepull ← 0035 (seated-rear-lateral-cable-raise), calf ← 0282, crunch ← 0291 — та же обработка (480 px, белый фон, 32 цвета), та же лицензия CC BY-SA 4.0.

Everkinetic (13.10, карта 2.9): chestpress ← dist/png/0066 («Bench Press: Machine») — та же обработка и лицензия; cablelat-0|1.png — копии latraise-0|1.png (0018), в приложении с подписью «На рисунке гантели». Тексты подсказок chestpress и cablelat — пересказ free-exercise-db (Machine_Bench_Press, Leverage_Chest_Press), Everkinetic 0066 (Steps) и описаний wger 129, 1378.

## barcode-detector 3.2.2 + zxing-wasm 3.1.3 — чтение штрихкода с фото
https://github.com/Sec-ant/barcode-detector · https://github.com/Sec-ant/zxing-wasm
- `vendor/barcode.js` — `dist/iife/ponyfill.js` из npm-пакета barcode-detector, без правок.
- `vendor/zxing_reader.wasm` — `dist/reader/zxing_reader.wasm` из npm-пакета zxing-wasm, без правок; собран из zxing-cpp (https://github.com/zxing-cpp/zxing-cpp, Apache License 2.0).

MIT License, Copyright (c) 2023 Ze-Zheng Wu (оба пакета; полный текст — как в блоке MIT выше).

## Open Food Facts — товары по штрихкоду и названию
https://world.openfoodfacts.org · база — Open Database License (ODbL) 1.0, содержимое — Database Contents License (DbCL) 1.0.
Данные запрашиваются с телефона напрямую (`api/v2/product/<код>.json`, `cgi/search.pl`), найденный по штрихкоду товар хранится в телефоне (`fit.off`). В записи еды источник подписан: «по базе: Open Food Facts, <марка>».

## HichamELBSI/react-native-body-highlighter — рисунок тела по мышцам
https://github.com/HichamELBSI/react-native-body-highlighter (13.10.2026)
- `body.js`: пути SVG из `assets/bodyFront.ts`, `assets/bodyBack.ts`, разложены по нашим группам мышц.

```
MIT License

Copyright (c) 2022 ELABBASSI Hicham

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

free-exercise-db (14.10, сгибания ног сидя): seatcurl-0|1.jpg ← exercises/Seated_Leg_Curl/0.jpg, 1.jpg (уменьшены до 900 px); подсказки — пересказ поля instructions. Лицензия: Unlicense.

free-exercise-db (15.10, версия 57): wristcurl-0|1.jpg ← exercises/Seated_Dumbbell_Palms-Up_Wrist_Curl/0.jpg, 1.jpg; revwrist-0|1.jpg ← exercises/Seated_Dumbbell_Palms-Down_Wrist_Curl/0.jpg, 1.jpg; revcurl-0|1.jpg ← exercises/Reverse_Barbell_Curl/0.jpg, 1.jpg (850 px, как есть); подсказки — пересказ поля instructions. Лицензия: Unlicense.
