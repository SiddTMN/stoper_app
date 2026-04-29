# Stoper treningowy

Statyczna aplikacja do odmierzania czasu podczas ćwiczeń: stoper, minutnik przerw i prosty planer treningu z nazwami ćwiczeń. Działa bez procesu budowania, więc dobrze pasuje do GitHub Pages.

## Funkcje

- Stoper z okrążeniami i różnicą czasu od poprzedniego okrążenia.
- Minutnik przerw z presetami 1, 2, 3 i 5 minut oraz własnym czasem w sekundach.
- Tryb treningu: lista ćwiczeń, czas pracy, czas przerwy i liczba rund.
- Gotowe szablony ćwiczeń oraz możliwość wpisania własnych nazw, po jednej w linii.
- Motyw jasny i ciemny, zapamiętywany w przeglądarce.
- Dźwięk i wibracja po zakończeniu minutnika lub kroku treningu, jeśli urządzenie i przeglądarka je obsługują.
- Wake Lock, czyli opcja niewygaszania ekranu podczas pomiaru.
- Service worker i manifest, dzięki którym aplikacja może działać wygodniej na telefonie i częściowo offline.

## Skróty klawiszowe

Skróty są widoczne również w aplikacji pod głównymi przyciskami.

- `Spacja` - start / stop
- `R` - reset, gdy pomiar nie trwa
- `L` - okrążenie w trybie stopera
- `1` - tryb stopera
- `2` - tryb minutnika
- `3` - tryb treningu
- `T` - przełączenie motywu

## GitHub Pages

Aplikacja nie wymaga procesu budowania. W ustawieniach repozytorium na GitHubie włącz Pages dla brancha z plikiem `index.html` w katalogu głównym.

Typowy układ plików:

```text
index.html
styles.css
app.js
manifest.webmanifest
sw.js
.nojekyll
README.md
```

Po publikacji warto otworzyć stronę raz na telefonie przez HTTPS. Dopiero wtedy funkcje przeglądarkowe takie jak service worker i Wake Lock mają najlepszą szansę działać poprawnie.
