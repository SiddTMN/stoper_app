# Stoper treningowy

Statyczna aplikacja do odmierzania czasu podczas ćwiczeń: stoper, minutnik przerw i prosty planer treningu z nazwami ćwiczeń. Działa bez procesu budowania, więc dobrze pasuje do GitHub Pages.

## Funkcje

- Stoper z okrążeniami i różnicą czasu od poprzedniego okrążenia.
- Minutnik przerw z presetami 1, 2, 3 i 5 minut oraz własnym czasem w sekundach.
- Tryb treningu: lista ćwiczeń, czas pracy, czas przerwy i liczba rund.
- Do 5 zapisanych treningów w przeglądarce, z możliwością wczytania, edycji, nadpisania i usunięcia.
- Domyślne treningi `Podstawowy`, `Core` i `Mobilność`, które można potraktować jako punkt startowy.
- Odliczanie 3-2-1 przed świeżym startem pomiaru, z osobnym przełącznikiem dźwięku.
- Tryb pełnoekranowy przydatny przy ćwiczeniach z dala od monitora.
- Motyw jasny i ciemny, zapamiętywany w przeglądarce.
- Dźwięk i wibracja po zakończeniu minutnika lub kroku treningu, jeśli urządzenie i przeglądarka je obsługują.
- Wake Lock, czyli opcja niewygaszania ekranu podczas pomiaru.
- Panel `Info` w aplikacji z krótką listą najważniejszych możliwości.
- Subtelne oznaczenie `powered by Sidd` w interfejsie.
- Service worker i manifest, dzięki którym aplikacja może działać wygodniej na telefonie i częściowo offline.

## Skróty klawiszowe

Skróty są widoczne również w aplikacji pod głównymi przyciskami.

- `Spacja` - start / stop
- `R` - reset, gdy pomiar nie trwa
- `L` - okrążenie w trybie stopera
- `1` - tryb stopera
- `2` - tryb minutnika
- `3` - tryb treningu
- `F` - pełny ekran
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

Po publikacji warto otworzyć stronę raz na telefonie przez HTTPS. Dopiero wtedy funkcje przeglądarkowe takie jak service worker, pełny ekran i Wake Lock mają najlepszą szansę działać poprawnie.
