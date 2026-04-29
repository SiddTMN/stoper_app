# Stoper treningowy

Prosta statyczna aplikacja do odmierzania czasu podczas ćwiczeń: stoper, minutnik przerw, okrążenia, dźwięk końca przerwy i opcja niewygaszania ekranu.

## Funkcje

- Stoper z okrążeniami i różnicą czasu od poprzedniego okrążenia.
- Minutnik przerw z presetami 1, 2, 3 i 5 minut oraz własnym czasem w sekundach.
- Motyw jasny i ciemny, zapamiętywany w przeglądarce.
- Dźwięk i wibracja po zakończeniu minutnika, jeśli urządzenie i przeglądarka je obsługują.
- Wake Lock, czyli opcja niewygaszania ekranu podczas pomiaru.
- Service worker i manifest, dzięki którym aplikacja może działać wygodniej na telefonie i częściowo offline.

## Skróty klawiszowe

- `Spacja` - start / stop
- `R` - reset, gdy pomiar nie trwa
- `L` - okrążenie w trybie stopera
- `1` - tryb stopera
- `2` - tryb minutnika
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
