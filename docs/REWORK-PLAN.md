# Rework-Plan · HexWars Diorama („One Crown“)

Stand 18.11.2026 · Bulk 0 bis 5 sind umgesetzt (Stand 0.2), Bulk 6 ist dein Spieltest · führt den Plan in `UMSETZUNGSPLAN.md` fort

## 1 · Worum es geht

HEXFRONT wird auf Kongregate als zu leicht empfunden: Truppen auf einem Feld sammeln, zum gegnerischen
Hauptquartier durchlaufen, fertig. Missionen dauern rund eine Minute. Der Prototyp 0.1 sieht deutlich besser
aus, hat aber dieselbe Schwäche, weil auch dort die größere Zahl sofort gewinnt.

**Ziel des Reworks:** ein Spiel, in dem Stapeln nicht reicht, in dem die Form der Front zählt, und in dem
eine Mission 4 bis 7 Minuten dauert. Zuerst am PC, das Handy bleibt als zweite Ansicht erhalten.

**Ausgangsmessung (Prototyp 0.1, Stärke „Normal“):** Ein Bot, der nur einen Stapel bildet und geradeaus
zur Burg läuft, gewinnt 13 bis 23 von 40 Duellen, meist nach 0:33 bis 1:13. Daran wird der Umbau gemessen.

## 2 · Die neuen Regeln

Vier Regeln, jede in einem Satz erklärbar:

| Nr. | Regel | Wirkung |
|---|---|---|
| 1 | **Versorgung.** Ein Feld versorgt 20 Truppen, die Burg 40, die Zitadelle 30. Was darüber liegt, schwindet. | Kein Stapel mit 99 Truppen mehr. Eine große Armee braucht eine breite Front. |
| 2 | **Kampf an den Kanten.** Ein Kampf dauert. An jeder Feldkante kämpfen höchstens 8 Angreifer gleichzeitig, alle Verteidiger wehren sich. | Ein Angriff von drei Seiten kostet etwa ein Drittel der Verluste. Wer nur von einer Seite kommt, verblutet an starken Feldern. |
| 3 | **Burgen fallen durch Umzingeln.** Folgt aus Regel 2: Eine volle Burg ist von einer Seite kaum zu nehmen, von vier Seiten gut. | Erst die Felder um die Burg nehmen, dann stürmen. Das ist die Schildgenerator-Idee aus HEXFRONT, nur auf jeder Karte und ohne Sondergebäude. |
| 4 | **Abgeschnitten schwindet.** Felder ohne Verbindung zur eigenen Burg wachsen nicht und verlieren Truppen. | Eine vorgepreschte Speerspitze lässt sich abschneiden. Das ist der Konter gegen den Durchmarsch. |

Dazu fünf Anpassungen:

- **Nachschub verteilt** auf alle Frontfelder mit freiem Platz, nicht auf einen Punkt.
- **Land zählt mehr, die Burg weniger:** Burg 0,8 statt 1,3 Truppen pro Sekunde.
- **Sturmbefehl:** Ein fremdes Feld zweimal antippen schickt alle angrenzenden eigenen Felder gleichzeitig.
  Der Pfeil sagt vorher, ob der Angriff reicht und wie viele übrig bleiben.
- **Freies Land kostet:** Neutrale Felder haben 8 bis 12 Verteidiger. Die Eröffnung ist damit eine
  Entscheidung, wohin man wächst, und kein Wettklicken.
- **Heimwache:** Die Burg behält 32 Truppen, die sechs Felder um sie 10. Steht ein Gegner in der Nähe,
  werden sie aufgefüllt wie eine Front.

Die Kronenregel bleibt: Wer eine Burg nimmt, bekommt das Reich. Die Truppen des gefallenen Reichs werden
aber auf ein Viertel gekürzt, damit der Sieger Land erbt und keine fertige Armee.

## 3 · Bulks

Jeder Bulk endet mit einem prüfbaren Ergebnis und einem eigenen Sicherungspunkt in der lokalen
Versionsverwaltung. Bulk 0 bis 5 gehören zu dieser Arbeitsrunde, Bulk 6 bis 11 folgen nach deinem Spieltest.

### Bulk 0 · Sicherung und Ausgangsmessung

- Stand des ersten Chats unverändert als Marke `prototyp-0.1` festhalten. Gearbeitet wird auf dem Zweig `rework`.
- Stapel-Bot gegen den alten Regelkern messen (siehe oben).

**Fertig, wenn** der alte Stand mit einem Befehl wiederherstellbar ist.

**Stand: erledigt.**

### Bulk 1 · Neuer Regelkern

- Regeln 1 bis 4 in `src/sim/game.js`, alle Zahlen in `src/sim/rules.js`.
- Vorhersage für einen Angriff (wer gewinnt, wie viele bleiben), genutzt von Pfeil und Gegnern.
- Nachschub verteilt nach freiem Platz.
- Regeltests ohne Browser in `tests/`.

**Fertig, wenn** die Regeltests grün sind: ein Angriff von drei Seiten kostet höchstens halb so viel wie von
einer, überfüllte und abgeschnittene Felder schwinden, eine Burg fällt nur mit ihrem Reich.

**Stand: erledigt.** Zehn Regeltests grün (`node --test tests/rules.test.mjs`).

### Bulk 2 · Gegner und Messwerkzeug

- Computergegner für die neuen Regeln: greift von mehreren Seiten an, verstärkt belagerte Felder, schützt
  Burg und Burgring, zwickt vorgepreschte Felder ab.
- Drei Stärken über Verhalten statt über geschenkte Truppen (nur „Leicht“ bekommt weniger Zuwachs).
- `tools/simulate.mjs` misst je Karte: Dauer, Fairness der Startplätze, festgefahrene Partien, untätiger
  Spieler, Stapel-Bot, starker Spieler.

**Fertig, wenn** auf „Normal“ der Stapel-Bot höchstens 1 von 10 Partien gewinnt, eine Partie im Mittel 4 bis
7 Minuten dauert, höchstens 1 von 20 Partien festfährt und ein untätiger Spieler mindestens 2:30 übersteht.

**Stand: drei von vier Kriterien erfüllt.** Der Stapel-Bot gewinnt 0 von 60 Partien. Ein starker Testspieler
braucht 3:18 bis 5:56. Ein untätiger Spieler übersteht mindestens 3:04. Nicht erfüllt: Spielen zwei gleich
starke Computer gegeneinander, enden auf Mission 2 und 3 rund ein Drittel der Partien nicht in 15 Minuten.

### Bulk 3 · Darstellung und Bedienung

- Belagerer stehen sichtbar an der Kante, mit eigener Zahl in ihrer Farbe. Funken, solange gekämpft wird.
- Pfeil mit Vorhersage („reicht, 7 bleiben“ oder „reicht nicht“) und Zahl der Angriffsseiten.
- Sturmbefehl per Doppelklick oder Doppeltipp.
- Volle Felder sind an der Zahl erkennbar, abgeschnittene bleiben gestrichelt.
- Handgebaute Karten werden im Hochformat gedreht dargestellt, damit sie am Handy die Höhe füllen.

**Fertig, wenn** ein Angriff von zwei Seiten im Bild als solcher erkennbar ist und die Vorhersage des Pfeils
mit dem tatsächlichen Ausgang übereinstimmt.

**Stand: erledigt.** Im Browser geprüft; die Übereinstimmung von Vorhersage und Ausgang ist ein Regeltest.

### Bulk 4 · Missionssystem und Missionen 1 bis 3

- Karten von Hand als Textraster in `src/sim/missions.js`, mit Prüfung auf Erreichbarkeit.
- Missionsziele als Baustein: „alle Burgen erobern“ und „ein Feld eine Zeit lang halten“.
- Einsatzbesprechung vor dem Start, Ziel dauerhaft in der Leiste, drei Sterne je Mission, Freischaltung der Reihe nach.

| Mission | Karte | Neu für den Spieler | Ziel |
|---|---|---|---|
| 1 · Erste Krone | Duell, kleine Insel | Schicken, Feldgröße 20, Angriff von zwei Seiten, Burg umzingeln | Burg erobern |
| 2 · Die zwei Pässe | Duell, Gebirgsriegel mit zwei Engstellen | Türme und Höfe, Abschneiden einer Speerspitze | Burg erobern |
| 3 · Drei Reiche | Zwei Gegner, Zitadelle in der Mitte | Mehrere Gegner, Kronenregel, zweiter Siegweg | Zitadelle 60 Sekunden halten oder beide Burgen erobern |

**Fertig, wenn** alle drei Missionen von Start bis Ergebnis fehlerfrei durchlaufen, ein starker Testspieler
jede auf „Normal“ gewinnt und dafür 3 bis 7 Minuten braucht, und der Stapel-Bot keine davon regelmäßig gewinnt.

**Stand: erledigt.** Messwerte in Abschnitt 7.

### Bulk 5 · Abnahme und Übergabe

- Durchlauf im Browser am PC (1280 × 720) und im Handy-Format (375 × 812): Menü, Besprechung, Partie, Sieg,
  Niederlage, Pause, Sprache.
- Balance nachziehen, Messwerte in dieses Dokument eintragen, Anleitung aktualisieren.

**Fertig, wenn** du `start.bat` doppelklicken und die drei Missionen spielen kannst.

**Stand: erledigt**, mit der Einschränkung, dass die Durchläufe von einem Testspieler-Programm gespielt wurden
und nicht von einem Menschen.

### Bulk 6 · Dein Spieltest und Feinschliff

- Du spielst die drei Missionen am PC. Fragen: Verstehst du ohne Erklärung, warum ein Angriff scheitert?
  Fühlt sich Umzingeln gut an? Ist „Normal“ zu leicht oder zu schwer? Dauer angenehm?
- Danach: Kampf im Bild deutlicher (Soldaten treffen aufeinander, Mauerstücke an der Burg), Ton, Mausrad-Zoom
  und Verschieben, Tastenkürzel.

**Fertig, wenn** du freiwillig eine vierte Partie startest.

### Bulk 7 · Akt 1 abschließen (Missionen 4 und 5)

- Neuer Baustein „schmale Kante“: Brücken und Furten, an denen nur 3 statt 6 Angreifer kämpfen.
- Mission 4: Flusskarte mit drei Brücken. Mission 5: Verbündeter, dessen Burg nicht fallen darf.

### Bulk 8 · Akt 2 (Missionen 6 bis 9)

- Verteidigungsmission (bis zur Verstärkung überleben), Nebel, zwei von drei Türmen halten.
- Gegner mit Charakter (vorsichtig, gierig, rachsüchtig).
- Eine Fähigkeit je Reich mit Abklingzeit, falls der Spieltest zeigt, dass Entscheidungen fehlen.

### Bulk 9 · Akt 3 und Finale (Missionen 10 bis 12)

- Vier Reiche, Finale allein gegen drei. Sterne mit konkreten Aufgaben, Freischaltungen (Banner, Burgformen).
- Zufallskarte und Tageskarte für das Wiederspielen.

### Bulk 10 · Technik für die Veröffentlichung

- Neues, schlankes GitHub-Repository. Bündelung zu wenigen Dateien, robustes Speichern, Qualitätsstufen,
  Verhalten bei verlorenem Grafikkontext, automatischer Browser-Durchlauf.

### Bulk 11 · Portale

- Kongregate, Y8, GameMonetize: Adapter und Paketskripte aus dem alten hexwars-Repository übernehmen,
  einschließlich der korrigierten Kongregate-Statistik. Name prüfen, Icon, Screenshots, Trailer.

## 4 · Was bewusst nicht in dieser Runde steckt

- Kein Mehrspieler, kein Zoom, keine Fähigkeiten, keine neuen Gebäude.
- Das alte hexwars-Repository wird nicht angefasst. Es wird nichts nach GitHub hochgeladen.

## 5 · Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Der Kantenkampf ist schwerer zu durchschauen als „größere Zahl gewinnt“ | Der Pfeil sagt das Ergebnis vorher. Mission 1 lehrt den Angriff von zwei Seiten ausdrücklich. |
| Partien fahren fest, weil Verteidigen zu stark wird | Messung in Bulk 2 mit Grenzwert. Sturmphase als Notbremse bleibt, aber später. |
| Gegner nutzt die neuen Regeln schlechter als ein Mensch | Stärken über Verhalten gestuft. „Schwer“ wird gegen den starken Testspieler gemessen. |
| Simulation ersetzt keinen Menschen | Bulk 6 ist dein Spieltest. Inhalt (Bulk 7 bis 9) entsteht erst danach. |

## 6 · Zurück zum alten Stand

Der Prototyp 0.1 liegt unverändert in der lokalen Versionsverwaltung. So bekommst du ihn als eigenen Ordner
neben dem Projekt, ohne die neue Arbeit zu berühren:

```bash
git worktree add "../HexWars Diorama 0.1" prototyp-0.1
```

## 7 · Ergebnisse dieser Runde

Gemessen mit `node tools/simulate.mjs 60` (60 Partien je Karte und Stärke, Breitbild).

**Starker Testspieler** (plant wie der schwere Computer, gibt aber nur alle 1,5 Sekunden einen Befehl):

| Mission | Leicht | Normal | Schwer |
|---|---|---|---|
| 1 · Erste Krone | 53 von 60 Siegen, 3:38 | 59 von 60, 3:18 | 58 von 60, 3:10 |
| 2 · Die zwei Pässe | 60 von 60, 5:13 | 60 von 60, 5:56 | 40 von 60, 8:48 |
| 3 · Drei Reiche | 59 von 60, 4:28 | 60 von 60, 4:42 | 60 von 60, 6:08 |

Mission 1 ist die Einführung; ihr Gegner verhält sich auf allen Stärken gleich.

**Stapel-Bot** (alles auf ein Feld, geradeaus zur Burg): 0 von 60 Siegen auf jeder Karte und jeder Stärke.
Im Prototyp 0.1 waren es 13 bis 23 von 40 Duellen.

**Untätiger Spieler:** fällt auf „Normal“ frühestens nach 4:04 (Mission 1), 3:34 (Mission 2), 3:04 (Mission 3).

### Geprüft und nicht geprüft

| Geprüft | Wie |
|---|---|
| Regeln | 10 Regeltests, darunter Vorhersage gegen tatsächlichen Ausgang und gleiche Partie bei gleichem Startwert |
| Menü, Besprechung, Partie, Sieg, Niederlage, nächste Mission, Freischaltung | im Browser, Missionen 1 bis 3 vom Testspieler-Programm durchgespielt, keine Fehlermeldung |
| Ziehen mit Vorhersage, Sturmbefehl mit zwei Tipps | im Browser mit nachgestellten Mausereignissen |
| Hochformat | 375 × 812: Karte gedreht, eigene Burg unten, jedes Feld antippbar |

| Nicht geprüft | Folge |
|---|---|
| Ein Mensch am Spiel | Spielgefühl, Verständlichkeit und Schwierigkeit sind offen; das ist Bulk 6 |
| Echtes Handy, Ton, Safari | wie beim Prototyp 0.1 |
| Flüssigkeit | der Browser-Bereich hier zeigt nur wenige Bilder pro Sekunde |

### Bekannte Schwächen

- **Mission 2 auf „Schwer“** gewinnt der Testspieler nur in 40 von 60 Partien und erst nach knapp 9 Minuten,
  also im Sturm. Die Pässe begünstigen den Verteidiger stark.
- **Mission 3 ist für den Spieler vermutlich leichter als gedacht:** Die beiden Rivalen reiben sich oft
  gegenseitig auf. Ohne Mensch gewinnt auf „Schwer“ immer der Platz des Spielers.
- **Gleich starke Computer fahren sich fest:** Auf Mission 2 und 3 enden auf „Normal“ 22 und 19 von 60
  Partien nicht in 15 Minuten. Mit einem Menschen am Zug ist das seltener, gemessen ist es nicht.
- **Zufallskarte (Gefecht):** Die erzeugten Inseln sind nicht für die neuen Regeln abgestimmt. Die
  Startplätze sind ungleich, und das erzeugte Duell ist mit 2:34 zu kurz.
- **Viele Zahlen im Bild**, sobald an mehreren Feldern gekämpft wird.
- **Der Computer schneidet nur zufällig ab.** Er bewertet Felder höher, deren Fall andere abtrennt, plant
  das Abschneiden aber nicht über mehrere Züge.
