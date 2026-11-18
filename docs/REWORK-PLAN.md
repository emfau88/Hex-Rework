# Rework-Plan · HexWars Diorama („One Crown“)

Stand 19.11.2026 · Bulk 0 bis 5 und die Nachbesserungen 1 bis 5 und 9 sind umgesetzt, dazu drei Fehlerkorrekturen aus einer Fremdprüfung (Stand 0.3.1, Abschnitt 10) und Tempo, Pause, Kampfanzeige und Kartenoptik (Stand 0.4, Abschnitt 11) sowie Rückmeldung, Zoom, Meer und Burgmauern (Stand 0.5, Abschnitt 12) · Bulk 6 ist dein Spieltest · führt den Plan in `UMSETZUNGSPLAN.md` fort

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

**Bauen** (seit Stand 0.3.1 so): Ein Gebäude wird mit den Truppen des Feldes bezahlt, eine bleibt stehen.
Ein Turm kostet 10 und je vorhandenem Turm 5 mehr, ein Hof 8 und je Hof 3 mehr.

| Das Feld braucht | Was geht | Betrifft |
|---|---|---|
| bis 20 Truppen | Vormerken und sparen, oder sofort kaufen | Turm 1 und 2, Hof 1 bis 4 |
| 21 bis 30 Truppen | nur Sofortkauf, wenn die Truppen schon auf dem Feld stehen | Turm 3 und 4, Hof 5 bis 8 |
| mehr als 30 Truppen | gesperrt | ab Turm 5, ab Hof 9 |

Der Preis steht mit dem Auftrag fest; ein offener Auftrag zählt für den Preis des nächsten Gebäudes schon
mit. Ein Feld ohne Verbindung zur Burg kann nicht sparen, sein Auftrag verfällt. So wird kein Auftrag mehr
angenommen, der nie fertig würde, und die Preisleiter begrenzt weiter die Zahl der Gebäude.

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

**Stand: erledigt.** Inzwischen 51 Tests grün (`node --test`): 13 für die Regeln, 9 fürs Bauen, 9 für die
Vorhersage, 20 für die Eingabe.

### Bulk 2 · Gegner und Messwerkzeug

- Computergegner für die neuen Regeln: greift von mehreren Seiten an, verstärkt belagerte Felder, schützt
  Burg und Burgring, zwickt vorgepreschte Felder ab.
- Drei Stärken über Verhalten statt über geschenkte Truppen (nur „Leicht“ bekommt weniger Zuwachs).
- `tools/simulate.mjs` misst je Karte: Dauer, Fairness der Startplätze, festgefahrene Partien, untätiger
  Spieler, Stapel-Bot, starker Spieler.

**Fertig, wenn** auf „Normal“ der Stapel-Bot höchstens 1 von 10 Partien gewinnt, eine Partie im Mittel 4 bis
7 Minuten dauert, höchstens 1 von 20 Partien festfährt und ein untätiger Spieler mindestens 2:30 übersteht.

**Stand: erledigt.** Der Stapel-Bot gewinnt 0 von 60 Partien. Ein starker Testspieler braucht auf „Normal“
2:46 bis 5:42 (Mission 1 ist damit kürzer als das Ziel, siehe „Bekannte Schwächen“ in Abschnitt 7). Ein
untätiger Spieler übersteht mindestens 2:39. Ohne Mensch enden auf „Normal“ höchstens 2 von 60 Partien ohne Sieger. Beim ersten
Anlauf war das letzte Kriterium verfehlt; es wurde mit den Nachbesserungen in Abschnitt 9 erreicht.

### Bulk 3 · Darstellung und Bedienung

- Belagerer stehen sichtbar an der Kante, mit eigener Zahl in ihrer Farbe. Funken, solange gekämpft wird.
- Pfeil mit Vorhersage („reicht, 7 bleiben“ oder „reicht nicht“) und Zahl der Angriffsseiten.
- Sturmbefehl per Doppelklick oder Doppeltipp.
- Volle Felder sind an der Zahl erkennbar, abgeschnittene bleiben gestrichelt.
- Handgebaute Karten werden im Hochformat gedreht dargestellt, damit sie am Handy die Höhe füllen.

**Fertig, wenn** ein Angriff von zwei Seiten im Bild als solcher erkennbar ist und die Vorhersage des Pfeils
mit dem tatsächlichen Ausgang übereinstimmt.

**Stand: erledigt.** Im Browser geprüft. Die Übereinstimmung von Vorhersage und Ausgang prüfen seit Stand
0.3.1 neun Tests, auch für abgeschnittene und überfüllte Verteidiger (Abschnitt 10), seit Stand 0.4 zehn.

### Bulk 4 · Missionssystem und Missionen 1 bis 3

- Karten von Hand als Textraster in `src/sim/missions.js`, mit Prüfung auf Erreichbarkeit.
- Missionsziele als Baustein: „alle Burgen erobern“ und „ein Feld eine Zeit lang halten“.
- Einsatzbesprechung vor dem Start, Ziel dauerhaft in der Leiste, drei Sterne je Mission, Freischaltung der Reihe nach.

| Mission | Karte | Neu für den Spieler | Ziel |
|---|---|---|---|
| 1 · Erste Krone | Duell, kleine Insel | Schicken, Feldgröße 20, Angriff von zwei Seiten, Burg umzingeln | Burg erobern |
| 2 · Die zwei Pässe | Duell, Gebirgsriegel mit zwei Engstellen | Türme und Höfe, Abschneiden einer Speerspitze | Burg erobern |
| 3 · Drei Reiche | Zwei Gegner, Zitadelle in der Mitte | Mehrere Gegner, Kronenregel, zweiter Siegweg | Zitadelle samt den sechs Feldern ringsum insgesamt 60 Sekunden halten, oder beide Burgen erobern |

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

- Neuer Baustein „schmale Kante“: Brücken und Furten, an denen nur 3 statt 8 Angreifer kämpfen.
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
- Das alte hexwars-Repository wird nicht angefasst.
- Veröffentlicht wird seit Stand 0.3 über GitHub Pages: Jeder Push auf `main` lässt die Tests laufen und ersetzt
  danach die öffentliche Spielversion (https://emfau88.github.io/Hex-Rework/). Portale folgen erst in Bulk 11.

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

## 7 · Ergebnisse (Stand 19.11.2026, Stand 0.3.1)

Gemessen mit `node tools/simulate.mjs 60` (60 Partien je Karte und Stärke, Breitbild). Die Werte vor den
Korrekturen und der Vergleich mit anderen Würfeln stehen in Abschnitt 10.

**Starker Testspieler** (plant wie der schwere Computer, gibt aber nur alle 1,5 Sekunden einen Befehl und sitzt
auf dem Platz des Spielers). Die Zeit ist der Median nur seiner gewonnenen Partien:

| Mission | Leicht | Normal | Schwer |
|---|---|---|---|
| 1 · Erste Krone | 60 von 60 Siegen, 2:42 | 60 von 60, 2:46 | 60 von 60, 2:38 |
| 2 · Die zwei Pässe | 60 von 60, 4:20 | 60 von 60, 4:06 | 53 von 60, 5:12 |
| 3 · Drei Reiche | 59 von 60, 4:36 | 58 von 60, 5:42 | 28 von 60, 6:59 |
| Gefecht · Duell | 59 von 60, 2:32 | 54 von 60, 3:26 | 21 von 60, 4:11 |
| Gefecht · Vier Reiche | 54 von 60, 4:16 | 17 von 60, 5:38 | 3 von 60, 5:01 |

Mission 1 ist die Einführung; ihr Gegner verhält sich auf allen Stärken gleich. Die Werte gelten ohne die
geführten Schritte, die den Gegner anfangs stillhalten lassen.

**Stapel-Bot** (alles auf ein Feld, geradeaus zur Burg): 0 von 60 Siegen auf jeder Karte und jeder Stärke.
Im Prototyp 0.1 waren es 13 bis 23 von 40 Duellen.

**Untätiger Spieler** fällt auf „Normal“ frühestens nach 4:04 (Mission 1), 3:34 (Mission 2), 2:39 (Mission 3).

**Ohne Mensch, „Normal“:** Partien ohne Sieger nach 15 Minuten: Mission 1 und 2 keine, Mission 3 zwei von 60.
Siege je Startplatz auf Mission 3: 2 / 25 / 31 (der Platz des Spielers ist nicht im Vorteil).

**Zahlen im Bild:** nicht neu gemessen, die Darstellung der Zahlen ist unverändert. Stand 0.3: In einer vom
Testspieler gespielten Partie überdeckte in Mission 1 nie eine Zahl eine andere, in Mission 2 in 5 von 237
geprüften Bildern eine einzelne, in Mission 3 in 3 von 215.

### Geprüft und nicht geprüft

| Geprüft | Wie |
|---|---|
| Regeln | 12 Regeltests, darunter Waffenruhe der Einführung und gleiches Land für jedes Reich auf Zufallskarten |
| Bauen | 9 Tests: kein Auftrag, der nicht fertig werden kann; Sofortkauf; Preis steht mit dem Auftrag fest; in Computer-Partien nach jedem Regelschritt kein unerfüllbarer Auftrag |
| Vorhersage gegen tatsächlichen Ausgang | 10 Tests: versorgte, abgeschnittene und überfüllte Verteidiger, Burg, Turm auf Hügel, zweite Welle, zwei Reiche im Anmarsch auf dasselbe Feld; derselbe Sieger, Rest auf 0,05 Truppen gleich |
| Eingabe | 16 Tests ohne Browser: zwei Tipps lösen aus, elf Arten von Abbruch oder Zwischenaktion entschärfen |
| Menü, Besprechung, Partie, Sieg, Niederlage, nächste Mission, Freischaltung | im Browser, Missionen 1 bis 3 vom Testspieler-Programm durchgespielt, keine Fehlermeldung (Stand 0.3; mit Stand 0.3.1 erneut Mission 1 bis zum Sieg und der Übergang zu Mission 2) |
| Ziehen mit Vorhersage, Sturmbefehl mit zwei Tipps, Abbruch mit Esc | im Browser mit echten Mausklicks: Tipp, Esc, Tipp schickt nichts; zwei Tipps schicken alle Nachbarn |
| Geführte Schritte | Stand 0.3.1: Mission 1 mit echten Klicks durch alle vier Schritte; Mission 2 mit gestelltem Spielstand durch alle drei Schritte, die Vorhersage am Verbindungsfeld (23 bleiben) traf genau ein. Mission 3 zuletzt mit Stand 0.3 |
| Bauknöpfe | im Browser am PC und bei 375 × 812: vormerken, „ab 21 Truppen“, „nur auf Wiese“; der vorgemerkte Turm wurde fertig |
| Hochformat | 375 × 812: Karten gedreht, eigene Burg unten, jedes Feld antippbar, auch auf der Zufallskarte (Stand 0.3) |

| Nicht geprüft | Folge |
|---|---|
| Ein Mensch am Spiel | Spielgefühl, Verständlichkeit und Schwierigkeit sind offen; das ist Bulk 6 |
| Echtes Handy, Ton, Safari | wie beim Prototyp 0.1 |
| Sturm mit zwei Tipps auf einem echten Touch-Bildschirm | Die Eingabe unterscheidet jetzt Maus und Finger (Abschnitt 10, Fehler 3). Das ist nur mit nachgestellten Ereignissen getestet, nicht mit einem Finger |
| Flüssigkeit | der Browser-Bereich hier zeigt nur wenige Bilder pro Sekunde |

### Bekannte Schwächen

- **Mission 3 auf „Schwer“ ist sehr hart.** Der Testspieler gewinnt 28 von 60 Partien und verliert meist
  die eigene Burg, weil ihn beide Rivalen angreifen.
- **Gefecht mit vier Reichen ist ab „Normal“ schwer** (17 von 60, auf „Schwer“ 3 von 60). Drei Gegner gegen
  einen lassen wenig Luft.
- **Mission 1 ist für den Testspieler kurz.** Er braucht 2:38 bis 2:46, das Ziel für eine Mission sind 3 bis
  7 Minuten. Ein Mensch mit den geführten Schritten braucht länger; gemessen ist das nicht.
- **Leichte Gegner beenden nichts untereinander.** Ohne Mensch laufen auf „Leicht“ Mission 2 immer und
  Mission 3 in 5 von 60 Partien bis zum Zeitlimit. Im Spiel fällt das nur auf, wenn man selbst nichts tut.
- **Mission 3 fährt ohne Mensch auf „Normal“ gelegentlich fest.** Mit den festen Startwerten 2 von 60, mit
  anderen Würfeln 4 und 5 von 60 (Abschnitt 10). Drei gleich starke Reiche halten sich dann die Waage.
- **Auf „Schwer“ im Vier-Reiche-Gefecht** gewinnt der beste Startplatz deutlich öfter als der schwächste
  (20 zu 12). Die Karte ist gespiegelt; der Rest ist Würfelglück in 60 Partien.
- **Der Testspieler ist ein Programm.** Er nutzt weder gezieltes Abschneiden noch das Überfüllen von
  Feldern vor einem Sturm. Ein Mensch kann besser oder schlechter abschneiden.

## 8 · Geführte Schritte

Beim ersten Durchspielen einer Mission führt eine kurze Anleitung, je ein Satz mit Markierung im Bild und
einem Zähler. Nach dem ersten Sieg entfällt sie.

| Mission | Schritt | Text | Geschafft, wenn |
|---|---|---|---|
| 1 | 1/4 | Ziehe von deiner Burg auf das markierte Feld. | das erste Feld erobert ist |
| 1 | 2/4 | Nimm zwei weitere Felder (0/2). Jedes Feld liefert Truppen. | zwei weitere erobert sind |
| 1 | 3/4 | Die Festung ist für ein Feld allein zu stark. Tippe sie zweimal an: Alle Nachbarn greifen zugleich an. | die kleine Festung neben der Burg erobert ist |
| 1 | 4/4 | Jetzt die Burg von EMBER: erst die Felder ringsum nehmen, dann von allen Seiten stürmen. | blendet nach 25 Sekunden aus |
| 2 | 1/3 | EMBER hält einen Vorposten auf deiner Seite. Zum Stürmen ist er zu stark. Nimm das markierte Feld dahinter. | der Vorposten keine Verbindung zur Burg mehr hat |
| 2 | 2/3 | Abgeschnitten! Der Vorposten verliert jetzt Truppen. Nimm ihn, sobald er schwach ist. | der Vorposten erobert ist |
| 2 | 3/3 | Jetzt durch einen Pass zur Burg von EMBER. Ein Turm hält eine Engstelle: eigenes Feld antippen, Turm bauen. | blendet nach 25 Sekunden aus |
| 3 | 1/3 | Ziel ist die Zitadelle in der Mitte. Nimm zuerst zwei Felder, die an sie grenzen (0/2). | zwei Felder am Ring erobert sind |
| 3 | 2/3 | Tippe die Zitadelle zweimal an: Alle deine Felder daneben greifen zugleich an. | die Zitadelle erobert ist |
| 3 | 3/3 | Die Uhr läuft erst, wenn dir alle Felder ringsum gehören (3/6). Nimm das markierte Feld. | der Ring geschlossen ist |

Die Anleitung reagiert auf das Spiel: Reicht ein Sturm noch nicht, steht das im Text; stellt der Gegner die
Verbindung zum Vorposten wieder her oder geht die Zitadelle verloren, springt sie einen Schritt zurück.
In Mission 1 hält der Gegner bis zum letzten Schritt still, in Mission 2 und 3 nicht.

## 9 · Nachbesserungen

| Nr. | Was | Stand |
|---|---|---|
| 1 | Mission 2 auf „Schwer“ entschärfen | **Erledigt.** Ziel war 50 von 60 Siegen in unter 7 Minuten; gemessen 58 von 60 in 5:05. Die Karte blieb, die Wirkung kommt vom Gegner, der jetzt nachsetzt. |
| 2 | Mission 3 anziehen | **Erledigt für „Normal“, auf „Schwer“ übers Ziel hinaus.** Der Platz des Spielers gewinnt ohne Mensch nicht mehr öfter als die anderen. Die Rivalen treffen sich nur noch an der Zitadelle, das Land ist gleicher verteilt, die Uhr zählt je Reich insgesamt. „Schwer“ ist jetzt sehr hart. |
| 3 | Gegner setzt nach | **Erledigt für „Normal“.** Ziel war höchstens 3 von 60 Partien ohne Sieger; gemessen 0, 0 und 3 auf Mission 1 bis 3. Frisch eroberte Felder rücken weiter vor, eine Reserve besetzt das eroberte Feld. Dabei gefunden und behoben: Der Nachschub bevorzugte Reiche im oberen Teil der Karte. |
| 4 | Zufallskarte anpassen | **Erledigt.** Die Insel ist jetzt links-rechts und oben-unten gespiegelt, alle Burgen stehen auf gleichem Land. Siege je Startplatz auf „Normal“: Duell 31 / 29, Vier Reiche 18 / 11 / 15 / 16. Das Duell dauert im Mittel 5:24 statt 2:34. Neu im Menü: Duell auf Zufallskarte. |
| 5 | Weniger Zahlen im Bild | **Erledigt bis auf Einzelfälle.** Belagerer tragen eine Zahl je Reich und Feld, Kämpfe zwischen Rivalen und Nachschubkolonnen tragen keine, Zahlen weichen einander aus. Rest siehe Abschnitt 7. |
| 6 | Kampf deutlicher zeigen | **Zum Teil erledigt** mit Stand 0.4 (Abschnitt 11). Offen: Mauerstücke an der Burg, Anzeige wie voll ein Feld ist, abgelehnte Befehle rückmelden. |
| 7 | PC-Bedienung (Zoom, Verschieben, Tastenkürzel) | **Zum Teil erledigt** mit Stand 0.4: Pause mit Befehlen, Tempo. Offen: Zoom, Verschieben, Tastenkürzel für Sturm und Bauen. |
| 8 | Ton, echtes Handy, Safari prüfen | offen, das kannst nur du |
| 9 | Geführte Schritte für Mission 2 und 3 | **Erledigt**, siehe Abschnitt 8. |
| 10 | Drei Fehler aus der Fremdprüfung | **Erledigt** mit Stand 0.3.1, siehe Abschnitt 10. |

## 10 · Korrekturen nach der Fremdprüfung (Stand 0.3.1, 19.11.2026)

Eine Fremdprüfung von Stand 0.3 hat drei Fehler nachgewiesen. Alle drei sind behoben und mit Tests
abgesichert. Roadmap-Punkte wurden dabei nicht begonnen, auch nicht die Rückmeldung bei abgelehnten Befehlen.

### Fehler 1 · Bauaufträge, die nie fertig wurden

- **Vorher:** Ein Auftrag wurde auch vorgemerkt, wenn das Feld den Preis nie erreichen konnte (dritter Turm,
  fünfter Hof). Das Feld gab dann keinen Nachschub mehr ab. In 180 von 180 Computer-Partien (Missionen 1 bis
  3, „Normal“ und „Schwer“, je 30 Startwerte) hing so ein Auftrag fest, der längste 827 Sekunden.
- **Jetzt:** Es gelten die Bauregeln aus Abschnitt 2. In denselben 180 Partien ist nach jedem einzelnen
  Regelschritt kein unerfüllbarer Auftrag offen, der längste Auftrag stand 64 Sekunden. Gebaut wird fast
  gleich viel (2086 statt 2223 Gebäude). Der Computer bestellt nichts mehr, was er nicht bezahlen kann.
- **Am Bauknopf:** Geht ein Gebäude nicht, steht der Grund darunter: „ab 21 Truppen“ (nur Sofortkauf),
  „Höchstzahl“ (gesperrt) oder „nur auf Wiese“ (Hof auf falschem Gelände).
- **Über den Vorschlag hinaus:** Der Preis steht mit dem Auftrag fest, und offene Aufträge zählen für den
  nächsten Preis mit. Ohne das könnte ein späterer Kauf oder ein erobertes Gebäude den Preis eines offenen
  Auftrags nachträglich über das hinausheben, was das Feld erreicht. Ein abgeschnittenes Feld verliert
  seinen Auftrag sofort, weil es nicht wächst.

### Fehler 2 · Die Vorhersage wich vom Kampf ab

- **Vorher:** Die Vorhersage rechnete beim Verteidiger weder den Schwund abgeschnittener Felder noch das
  Schmelzen überfüllter Felder mit, ließ die Angreifer ohne Anmarsch sofort kämpfen und versprach mehr
  Überlebende, als auf das eroberte Feld passen.
- **Jetzt:** Kampf und Vorhersage benutzen dieselben drei Rechenschritte in `src/sim/game.js`: `_drift`
  (Wachstum, Schwund, Schmelzen), `_clash` (ein Schritt Kampf an den Kanten) und `_spoils` (wer einzieht und
  mit wie vielen). Die Vorhersage zählt außerdem die Schritte des Anmarschs so wie das Spiel. Sie kann
  deshalb nur noch abweichen, wenn jemand nach dem Befehl noch etwas anderes befiehlt.

| Nachgestellter Fall | Vorhersage vorher | Tatsächlich |
|---|---|---|
| Abgeschnittenes Feld mit 8, ein Nachbar schickt 8 | hält, Rest 0,01 | fällt, 3,64 bleiben |
| Abgeschnittenes Feld mit 20, je 10 von zwei Seiten | hält mit 4,1 | fällt, 4,85 bleiben |
| Freies Feld mit 8, zweimal 19 Angreifer | 35,8 bleiben | 30 bleiben |
| Überfülltes, versorgtes Feld mit 29, dreimal 14 Angreifer | 23,6 bleiben | 25,2 bleiben |
| Zweite Welle, während die erste schon kämpft | 10,9 bleiben | 6,4 bleiben |

  Jetzt nennt die Vorhersage in allen neun getesteten Fällen denselben Sieger, und der Rest stimmt auf 0,05
  Truppen.
- **Sicherheitsreserve des Computers:** Der Computer plant mit einem Aufschlag (`margin`). Früher tat er so,
  als stünden mehr Verteidiger auf dem Feld; mit dem Schmelzen überfüllter Felder wäre dieser Aufschlag
  weggeschmolzen. Jetzt nimmt er an, dass die Besatzung um den Aufschlag besser kämpft.
- **Einführung:** Die geführten Schritte, die die Vorhersage benutzen (Festung in Mission 1, Zitadelle in
  Mission 3) und der Ablauf „Abschneiden“ in Mission 2 laufen wie zuvor; Mission 1 und 2 sind im Browser
  nachgespielt.
- **Zwei alte Tests** rechnen mit 36 statt 60 Angreifern. Mit 60 passen die Überlebenden nicht mehr auf das
  Feld, und die Vorhersage verspricht sie nicht mehr.

### Fehler 3 · Ein abgebrochener Sturm löste trotzdem aus

- **Vorher:** Der erste Tipp auf ein fremdes Feld schaltete den Sturm scharf. Esc, Rechtsklick, Tipp ins
  Leere, Tipp auf ein eigenes Feld oder eine abgebrochene Geste blendeten nur die Vorschau aus. Ein
  einzelner Tipp danach schickte alle Nachbarfelder los.
- **Jetzt:** Jeder Abbruch und jede andere Aktion entschärft: dazu ein Zug, ein Befehl dazwischen, ein Knopf
  oder eine Taste, die Pause, und wenn die Maus das Feld oder die Karte verlässt. Ausgelöst wird nur, wenn
  die Vorschau genau dieses Feldes noch im Bild steht.
- **Dabei gefunden:** Am Handy meldet der Browser nach jedem Tipp, dass der Zeiger die Karte verlassen hat.
  Das blendete die Vorschau des ersten Tipps aus; jetzt gilt das nur noch für die Maus. Das folgt aus der
  Beschreibung, wie Browser Berührungen melden, und ist mit nachgestellten Ereignissen getestet, nicht mit
  einem Finger auf einem echten Handy.

### Balance vorher und nachher

Starker Testspieler, Siege von 60 und Median der Zeit seiner Siege, mit den festen Startwerten:

| Karte | Leicht | Normal | Schwer |
|---|---|---|---|
| Mission 1 | 59 in 3:05 → 60 in 2:42 | 58 in 2:52 → 60 in 2:46 | 59 in 2:49 → 60 in 2:38 |
| Mission 2 | 60 in 4:38 → 60 in 4:20 | 60 in 3:45 → 60 in 4:06 | 58 in 5:05 → 53 in 5:12 |
| Mission 3 | 57 in 4:53 → 59 in 4:36 | 59 in 6:03 → 58 in 5:42 | 23 in 8:00 → 28 in 6:59 |
| Gefecht · Duell | 59 in 2:48 → 59 in 2:32 | 49 in 3:35 → 54 in 3:26 | 16 in 4:31 → 21 in 4:11 |
| Gefecht · Vier Reiche | 47 in 5:09 → 54 in 4:16 | 17 in 5:01 → 17 in 5:38 | 4 in 5:02 → 3 in 5:01 |

Unterschiede von wenigen Siegen sind bei 60 Partien Würfelglück. Deshalb sind alle Karten zusätzlich mit zwei
weiteren Sätzen von Startwerten gemessen (`--shift=1` und `--shift=2`), vorher wie nachher. Siege von 180:

| Karte | Leicht | Normal | Schwer |
|---|---|---|---|
| Mission 1 | 170 → 180 | 178 → 180 | 179 → 180 |
| Mission 2 | 180 → 180 | 180 → 180 | 169 → 168 |
| Mission 3 | 163 → 178 | 170 → 177 | 79 → 84 |
| Gefecht · Duell | 178 → 179 | 152 → 164 | 61 → 66 |
| Gefecht · Vier Reiche | 149 → 171 | 55 → 56 | 18 → 18 |

Der Stapel-Bot gewinnt vorher wie nachher 0 von 180 auf jeder Karte und Stärke.

Partien ohne Sieger nach 15 Minuten, ohne Mensch (feste Startwerte von 60, in Klammern alle drei Sätze von 180):

| Karte | Leicht | Normal | Schwer |
|---|---|---|---|
| Mission 1 | 0 → 0 | 0 → 0 | 0 → 0 |
| Mission 2 | 60 → 60 | 0 → 0 | 0 → 0 |
| Mission 3 | 11 → 5 (27 → 15) | 3 → 2 (5 → 11) | 0 → 0 |
| Gefecht · Duell | 4 → 5 (10 → 11) | 0 → 0 (1 → 1) | 0 → 0 |
| Gefecht · Vier Reiche | 37 → 35 (105 → 87) | 0 → 0 | 0 → 0 |

**Abgleich mit den Zielen**

| Ziel | Ergebnis |
|---|---|
| Stapel-Bot bleibt bei 0 | erreicht |
| Kampagne auf „Leicht“ und „Normal“ klar gewinnbar (etwa 55 von 60) | erreicht: 58 bis 60 von 60 |
| 3 bis 7 Minuten | Mission 2 und 3 erreicht. **Mission 1 nicht:** 2:42 und 2:46 statt 3:05 und 2:52 |
| Mission 3 auf „Schwer“ nicht schlechter | erreicht: 28 statt 23 von 60, über drei Sätze 84 statt 79 von 180 |
| Vier-Reiche-Gefecht nicht schlechter | kein Unterschied messbar: „Normal“ 17 → 17, „Schwer“ 4 → 3, über drei Sätze 55 → 56 und 18 → 18 von 180 |
| Patt-Partien nehmen nicht zu | insgesamt weniger (auf „Leicht“). **Offen bei Mission 3 auf „Normal“:** mit den festen Startwerten 2 statt 3, über drei Sätze aber 11 statt 5 von 180 |

**Nachstimmen: nichts geändert.** Die Zahlen in `src/sim/rules.js` und `src/sim/missions.js` sind dieselben
wie in Stand 0.3. Geprüft wurde je eine Stellschraube mit 60 Partien, keine wurde übernommen:

| Stellschraube | Gemessen | Warum nicht übernommen |
|---|---|---|
| Mission 1: Zuwachs des Gegners 0,9 → 1,0 | 56 / 59 / 55 Siege in 3:06 / 2:52 / 3:07 | bringt die alte Dauer zurück, kostet aber Siege und macht die Einführung schwerer. Das soll der Spieltest entscheiden |
| Mission 1: Zuwachs des Gegners 0,9 → 0,95 | 60 / 59 / 60 in 2:44 / 2:44 / 2:52 | kaum Wirkung auf die Dauer |
| Mission 1: Gegner lässt 7 statt 5 Truppen an der Front | 60 / 60 / 60 in 2:41 / 2:32 / 2:44 | keine Wirkung |
| Mission 2 auf „Schwer“: Zuwachs 0,85 → 0,8 | 60 in 4:17 | nicht nötig: der Rückgang von 58 auf 53 ist Würfelglück (über drei Sätze 169 → 168) |
| Mission 2 auf „Schwer“: eine statt zwei Folgewellen | 56 in 5:16 | wie oben |
| Mission 2 auf „Schwer“: Burgsturm erst ab 5:00 statt 3:30 | 53 in 5:12 | keine Wirkung |
| Mission 3 auf „Normal“: Aufschlag 1,18 → 1,12 | 10 von 180 ohne Sieger | hilft nicht |
| Mission 3 auf „Normal“: zwei statt einer Folgewelle | 9 von 180 ohne Sieger | hilft nicht nachweisbar |
| Sicherheitsreserve anders gerechnet (mehr Verteidiger statt bessere) | Mission 3 „Normal“ 11 von 180 ohne Sieger, Vier Reiche „Normal“ 47 statt 56 Siege von 180 | hilft nicht, im Vier-Reiche-Gefecht eher schlechter |

**Was gemessen ist und was nur vermutet**

- Gemessen: alle Zahlen in den Tabellen oben, mit dem Stand, der committet ist.
- Vermutet: Dass Mission 3 auf „Normal“ ohne Mensch etwas öfter festfährt als vorher. 11 gegen 5 von 180
  kann noch Zufall sein. Dass drei weitere Varianten des neuen Standes ebenfalls bei 9 bis 11 landen, spricht
  eher für eine kleine echte Zunahme. In diesen Partien halten sich drei etwa gleich große Reiche die Waage,
  keines kommt auf 60 Sekunden an der Zitadelle. Die Ursache ist nicht geklärt.
- Vermutet: Dass Mission 1 schneller endet, weil der Testspieler mit der genauen Vorhersage sparsamer
  angreift. Geprüft ist nur, dass es an allen drei Sätzen von Startwerten so ist (2:34 bis 2:46).

Das Messwerkzeug kann seit diesem Stand mit anderen Würfeln messen: `node tools/simulate.mjs 60 --shift=1`.
Ohne die Angabe bleiben die Startwerte die, mit denen alle Zahlen in Abschnitt 7 gemessen sind.

## 11 · Tempo, Pause, Kampfanzeige und Kartenoptik (Stand 0.4, 19.11.2026)

Anlass war dein Eindruck nach den ersten Partien: zu schnell, um zu lesen, zu planen und zu bauen; nicht zu
sehen, wie weit ein Feld eingenommen ist; Gebirge wiederholen sich; erhöhte Felder wirken steil. Vier Blöcke,
jeder mit Abnahmekriterium. Die Kriterien sind Fragen an dich; hier steht, was vorher schon geprüft ist.

| Block | Was | Fertig, wenn | Stand |
|---|---|---|---|
| 1 | Tempo-Schalter und Pause mit Befehlen | du eine Mission auf „Ruhig“ spielst und sagst, du kommst mit | gebaut, im Browser geprüft; dein Urteil steht aus |
| 2 | Kampfanzeige | du bei zwei Angreifern ohne Nachrechnen sagst, wer das Feld bekommt | gebaut, im Browser am PC und im Handy-Format geprüft; dein Urteil steht aus |
| 3 | Kampfanimation | ein Zuschauer ohne Erklärung erkennt, wer wo angreift | gebaut, nur als Standbilder geprüft |
| 4 | Gebirge und Böschungen | keine zwei Bergfelder gleich aussehen und jedes Feld antippbar bleibt | gebaut, im Browser angesehen; Antippen läuft über die unveränderte Oberseite der Felder |

### Block 1 · Tempo und Pause

- **Tempo:** Ruhig (75 %), Normal (100 %), Schnell (130 %), im Menü und im Hilfe-Fenster. Beim ersten Start
  gilt „Ruhig“. Das Tempo dehnt nur die Zeit: Die Regeln rechnen dieselben Schritte, die Gegner entscheiden in
  Spielzeit. Die Balance aus Abschnitt 7 gilt deshalb für jedes Tempo. Auf „Ruhig“ dauert eine Mission in
  echter Zeit ein Drittel länger (Mission 2 etwa 5:30 statt 4:06). Uhr und Zeit-Stern zählen Spielzeit.
- **Pause mit Befehlen:** Pause-Knopf, Leertaste oder P halten das Spiel an. Die Karte bleibt sichtbar,
  Schicken, Sturm und Bauen gehen weiter, die Vorhersage am Pfeil auch. Das alte Pausenfenster (Kurzanleitung,
  Neustart, Menü) liegt hinter dem Knopf „Hilfe“. Die Kurzanleitung sagt jetzt, was Turm und Hof bringen.
- **Nicht gebaut:** automatische Pause beim Bauen. Bauen ist ein Klick; die Pause mit Befehlen deckt das ab.
- **Nicht geändert:** die Dauer der Kämpfe selbst. Das würde die Balance ändern und müsste neu gemessen werden.
- Geprüft im Browser: Auf „Ruhig“ rechnet das Spiel je Bild 0,075 statt 0,1 Sekunden. In der Pause steht die
  Spielzeit, ein Befehl mit echten Klicks wird angenommen, die Leertaste setzt fort.

### Block 2 · Kampfanzeige

- Der Rand der Feldzahl färbt sich von oben im Uhrzeigersinn in den Farben der Angreifer, so weit die
  Besatzung seit Kampfbeginn gefallen ist. Ist er einmal herum, fällt das Feld. Greifen zwei Reiche an,
  teilen sie sich den gefärbten Teil nach ihrer Stärke an den Kanten.
- Betrifft der Kampf den Spieler, sitzt auf dem Rand eine kleine Ansage: in wie vielen Sekunden das Feld
  fällt und an wen (farbiger Punkt), oder „hält“. Die Sekunden sind echte Sekunden beim gewählten Tempo.
- Die Ansage benutzt dieselbe Rechnung wie Kampf und Pfeil (Abschnitt 10) und zählt Armeen mit, die schon
  unterwegs sind. Ein Test stellt das nach: Zwei Reiche marschieren auf dasselbe Feld, Sieger, Rest und
  Zeitpunkt treffen ein. Der Computer plant unverändert nur mit dem, was an den Kanten steht.
- Geprüft im Browser: Vorhergesagt war, dass EMBER ein Feld mit 11,9 Truppen nimmt, während AZUR mit angreift;
  genau so kam es. Im Handy-Format verdeckt die Ansage keine Nachbarzahl mehr.

### Block 3 · Kampfanimation

- Die Besatzung verlässt ihre Reihe und stellt sich den Angreifern an der Kante, beide schlagen im Wechsel zu.
- Staub an der Kante, Pfeile vom Turm auf die Belagerer, die letzte Figur schrumpft mit der sinkenden Zahl.
- Alles läuft mit der Uhr der Regeln: In der Pause steht der Kampf, auf „Ruhig“ ist er langsamer.
- Offen: Mauerstücke an der Burg, umfallende Figuren (die Figuren lassen sich bisher nur drehen und verkleinern).

### Block 4 · Gebirge und Böschungen

- **Gebirge:** Bisher hatte jedes Bergfeld dieselben drei Felsen an denselben Stellen. Jetzt hat jedes Feld
  eine eigene Gruppe: ein Hauptgipfel, im Inneren eines Gebirges höher als am Rand, und ein bis drei kleinere.
  Zahl der Seiten, Höhe und Farbton wechseln. Felsen auf gemeinsamen Kanten verdecken das Raster.
- **Böschungen:** Wo ein Feld deutlich höher liegt als sein Nachbar, fällt sein eigener Rand als Hang auf
  die Höhe des Nachbarn ab, statt in einer senkrechten Wand zu enden. Der Hang geht auf Kosten des höheren
  Feldes: Dessen ebene Oberseite wird auf dieser Seite kleiner, jedes Nachbarfeld behält sein volles
  Sechseck. Der Hang trägt die Farbe seines Feldes, die Grenzlinie läuft an seinem Fuß; zum Wasser hin ist er
  Strand. Verteidiger eines Hügels stehen oben an der Hangkante, Angreifer unten am Fuß. Felsen und Türme
  reichen etwas in den Boden, damit sie am Hang nicht schweben.
  (Im ersten Anlauf lag der Hang auf dem Nachbarfeld. Das ließ die Nachbarn kleiner aussehen und machte
  unklar, zu wem der Hang gehört; auf deinen Hinweis hin umgebaut.)

### Balance

Die Regeln sind unverändert. Neu sind nur zwei Dinge für die Anzeige: Das Spiel merkt sich die Besatzung zu
Kampfbeginn, und die Vorhersage kann auf Wunsch Armeen im Anmarsch mitzählen. Gegenprobe mit 60 Partien:
Mission 1 und Mission 3 auf „Normal“ liefern Zeile für Zeile dieselben Werte wie in Abschnitt 7. Die anderen
Karten sind nicht erneut gemessen.

### Nicht geprüft

| Was | Folge |
|---|---|
| Ob „Ruhig“ sich richtig anfühlt | das zeigt nur dein Spieltest |
| Die Kampfanimation in Bewegung | der Browser-Bereich hier zeigt etwa ein Bild pro Sekunde; geprüft sind Standbilder |
| Flüssigkeit am echten Handy mit den zusätzlichen Hängen und Felsen | offen |
| Zufallskarten mit Böschungen im Hochformat | angesehen sind Mission 1 bis 3 und die Vier-Reiche-Karte |

## 12 · Rückmeldung, Zoom, Meer und Burgmauern (Stand 0.5, 19.11.2026)

Die vier Punkte „Zuerst machen“ aus der Roadmap. Die Regeln sind unverändert; neu ist nur eine Abfrage, warum
ein Befehl nicht ausgeführt würde. Die Balance ist deshalb nicht neu gemessen.

| Nr. | Was | Fertig, wenn | Stand |
|---|---|---|---|
| 1 | Abgelehnte Befehle rückmelden | ein Spieler bei jedem abgelehnten Befehl den Grund sieht | gebaut, ein Regeltest, im Browser gesehen („Zu wenig Truppen“) |
| 2 | Zoom und Verschieben | sich am Handy jedes Feld sicher antippen lässt und man mit einem Griff zur Übersicht zurückkommt | gebaut, vier Tests; im Browser Mausrad, Ziehen und Taste 0 geprüft. **Zwei Finger nur im Test, nicht am echten Handy** |
| 3 | Meer statt Leere | am PC und am Handy kein leerer dunkler Rand mehr zu sehen ist | gebaut, im Browser am PC und im Handy-Format angesehen |
| 4 | Bröckelnde Burgmauern | ein Zuschauer an der Burg erkennt, von wie vielen Seiten sie schon offen ist | gebaut, im Browser gesehen: Mauer fällt, wenn ein Gegner das Nachbarfeld hält |

- **Rückmeldung:** Wird ein Befehl nicht ausgeführt, schwebt am Feld kurz der Grund auf: „Zu wenig Truppen“
  (eine bleibt immer stehen), „Ziel ist voll“ oder „Kein Weg dorthin“. Beim Sturm erscheint „Zu wenig
  Truppen“, wenn kein einziges Nachbarfeld etwas abgeben kann.
- **Zoom und Verschieben:** Mausrad oder zwei Finger vergrößern bis 2,6-fach, immer um die Stelle unter dem
  Zeiger. Ziehen auf fremdem oder leerem Gebiet verschiebt die Karte; Ziehen von einem eigenen Feld bleibt
  ein Befehl. Zwei Finger brechen jede begonnene Geste ab und können nie Truppen schicken. Der Knopf neben der
  Uhr und die Taste 0 zeigen wieder die ganze Insel; jede neue Partie beginnt so.
- **Meer:** Der Tisch unter der Insel ist einer Wasserfläche gewichen, die im Dunst verschwindet, mit ein paar
  Schären vor der Küste. Felder am Rand der Insel fallen jetzt wie an jedem Wasserfeld mit einem Strand ab.
  Weil die Klippen im Wasser stehen, füllt die Insel den Bildschirm etwas besser aus.
- **Burgmauern:** Eine stehende Burg hat zu jedem begehbaren Nachbarfeld ein Mauerstück. Es steht, solange das
  Feld dem Verteidiger gehört oder frei ist, und fällt zu Schutt, sobald ein Gegner es hält. Nimmt der
  Verteidiger das Feld zurück, steht die Mauer wieder auf. Die Mauern sind nur Anzeige, sie ändern keine Regel.

Nicht geprüft: zwei Finger auf einem echten Handy; ob die Mauern am Handy noch zu erkennen sind (die Burg ist
dort klein); Zufallskarten mit dem Meer im Hochformat.
