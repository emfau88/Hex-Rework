# Rework-Plan · HexWars Diorama („One Crown“)

Stand 19.11.2026 · Bulk 0 bis 5 und die Nachbesserungen 1 bis 5 und 9 sind umgesetzt, dazu drei Fehlerkorrekturen aus einer Fremdprüfung (Stand 0.3.1, Abschnitt 10) und Tempo, Pause, Kampfanzeige und Kartenoptik (Stand 0.4, Abschnitt 11) sowie Rückmeldung, Zoom, Meer und Burgmauern (Stand 0.5, Abschnitt 12) und Figuren, Gebäude und Seitenleisten (Stand 0.6, Abschnitt 13). Mit Stand 0.7 sind die Gegner für Menschen neu abgestimmt (Abschnitt 14); die Messwerte in Abschnitt 7 sind damit überholt · Bulk 6 ist dein Spieltest · führt den Plan in `UMSETZUNGSPLAN.md` fort

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

**Stand: erledigt.** Inzwischen 52 Tests grün (`node --test`): 13 für die Regeln, 9 fürs Bauen, 9 für die
Vorhersage, 20 für die Eingabe, 1 für die Zahlen im Bild.

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

> **Überholt durch Abschnitt 14 (Stand 0.7).** Die Zahlen hier gelten für die alten Stärken und für einen
> Testspieler, der alle 1,5 Sekunden einen Befehl gibt. Für einen Menschen waren sie viel zu optimistisch.

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

## 13 · Figuren, Schatten, Gebäude und Seitenleisten (Stand 0.6, 19.11.2026)

Die Punkte 5 bis 9 („Danach“) aus der Roadmap. Alles ist Darstellung: An den Regeln ist nichts geändert, die
Balance ist deshalb nicht neu gemessen, und es gibt keine neuen Tests (51 bleiben grün).

| Nr. | Was | Stand |
|---|---|---|
| 5 | Weiche Schatten unter Figuren und Gebäuden | gebaut: ein dunkler, weicher Fleck unter jeder Figur, jedem Turm, Hof, jeder Burg und Zitadelle. Im Browser kaum auffällig, wie gewollt |
| 6 | Figuren mit klarem Umriss | gebaut und im Browser gesehen: AZUR Kamm in Reichsfarbe, EMBER Hörner, JADE Spitzhelm, SOLAR breite Krempe. Schild und Speer gab es schon |
| 7 | Gebäude mit Zustand | gebaut und gesehen: Fahne am Turm in Reichsfarbe; Getreide am Hof wächst mit der Besatzung von grün zu gold und steht dürr, wenn das Feld abgeschnitten ist; Rauch, solange es versorgt ist |
| 8 | Umfallende Figuren | gebaut und als Standbild gesehen: Im Kampf kippt die letzte Figur einer Besatzung oder eines Belagerertrupps nach hinten um, während ihre Truppen fallen. Im Frieden wächst die neueste Figur wie bisher heran |
| 9 | Seitenleisten am PC | gebaut und gesehen: oben links das eigene Reich (Felder, Truppen, Zuwachs pro Sekunde, Türme, Höfe), oben rechts die Gegner und die letzten fünf Ereignisse |

- **Seitenleisten:** nur ab 1100 Punkten Breite im Querformat, in den oberen Ecken über dem Meer. Sie lassen
  jeden Klick zur Karte durch. Ereignisse: verlorenes Feld, Angriff auf die eigene Burg, gefallenes Reich,
  eroberte Zitadelle, fertiges Gebäude, Sturm. Eigene Eroberungen stehen nicht dort, das wären zu viele.
- **Zuwachs** zählt nur Felder, die noch wachsen; volle Felder zählen nicht.
- **Technik:** Jede Figur trägt jetzt ihr Reich und eine Neigung mit sich. Die Helmteile aller vier Reiche
  stecken in einem Modell, gezeichnet wird je Figur nur der ihres Reichs. Die Schatten liegen in einem eigenen
  Durchgang, der den Boden abdunkelt.

Nicht geprüft: die Bewegung (Umfallen, Rauch, Wachsen des Getreides) im laufenden Spiel, nur Standbilder;
Flüssigkeit am echten Handy mit den zusätzlichen Schatten; ob die Helme am Handy noch zu unterscheiden sind
(eine Figur ist dort etwa zehn Bildpunkte groß); JADE und SOLAR habe ich nicht im Bild gesehen, nur AZUR und
EMBER.

### Nachtrag · Zahl über marschierenden Truppen ruckelte am Handy

Gemeldet aus deinem Test am Handy: Auf langen Wegen über mehrere Felder ruckelte und flackerte die Zahl über
der Truppe. Ursache: Die Zahl wich den Feldzahlen aus und suchte sich in jedem Bild die nächste freie Lücke.
Am Handy stehen die Feldzahlen so dicht, dass sie dabei von Lücke zu Lücke sprang. Ein neuer Test stellt das
nach (Kamera in Handygröße, Weg über fünf Felder): vorher bis zu 29 Bildpunkte Sprung zwischen zwei Bildern,
jetzt unter 3. Die Zahl reist jetzt fest über der Truppe mit und weicht nicht mehr aus; stehende Zahlen
(Belagerer an der Kante) weichen weiter aus. Nicht geprüft: am echten Handy.

## 14 · Neuabstimmung für Menschen (Stand 0.7, 19.11.2026)

**Anlass:** Du fandest Mission 1 als Mensch sehr schwer. Die Messung gab dir recht. Alle bisherigen Aussagen
(„Kampagne klar gewinnbar“) galten für einen Testspieler, der alle 1,5 Sekunden einen Befehl gibt. Ein Mensch
braucht eher drei bis acht Sekunden.

### Was die Messung vorher zeigte (Stand 0.6, „Normal“, Siege von 60)

| Testspieler | Mission 1 | Mission 2 | Mission 3 |
|---|---|---|---|
| gründlich, Befehl alle 1,5 s (der alte Maßstab) | 60 | 60 | 58 |
| gründlich, alle 3 s | 45 | 15 | 0 |
| gründlich, alle 5 s | 3 | 0 | 0 |
| Anfänger, alle 3 s | 41 | 0 | 0 |
| Anfänger, alle 5 s | 0 | 0 | 0 |

„Anfänger“ plant wie der frühere leichte Computer: höchstens zwei Seiten, keine Folgewellen, großer
Sicherheitsabstand. „Leicht“ half in Mission 1 nicht (32 statt 45 Siege bei 3 s), weil deren Gegner auf allen
Stufen gleich spielte. Während der geführten Schritte breitete sich der Gegner aus: nach 60 Sekunden Lesen
hatte er 15 Felder Vorsprung, nach 120 Sekunden 26.

### Was geändert ist

1. **Neuer Maßstab.** `tools/simulate.mjs` misst jetzt vier Stellvertreter: „stark“ (alle 1,5 s), „3 s“,
   „Anfänger 5 s“ und „8 s“. Ihr Können steht fest im Werkzeug und ändert sich nicht, wenn die Gegner neu
   eingestellt werden.
2. **Stärken für Menschen** (`src/sim/rules.js`). Entscheidend ist, wie oft der Gegner befiehlt:

   | Stufe | Gegner entscheidet | Zuwachs | gedacht für |
   |---|---|---|---|
   | Leicht | alle 14 s (vorher 2,6 s) | 60 % (vorher 85 %) | Anfänger mit etwa 8 s pro Befehl |
   | Normal | alle 10 s (vorher 1,6 s) | 80 % (vorher 100 %) | Spieler mit etwa 5 s pro Befehl |
   | Schwer | alle 3 s (vorher 1,3 s, zwei Befehle) | 100 % | Geübte mit 2 bis 3 s pro Befehl |

   „Schwer“ entspricht damit etwa dem früheren „Normal“, nur etwas langsamer. Das frühere „Schwer“ gibt es
   nicht mehr.
3. **Je Mission** (`src/sim/missions.js`): Mission 1 ist auf jeder Stufe etwas sanfter (12 s auf „Normal“).
   Mission 3 dauert wegen des Ziels lange; ihre Gegner entscheiden noch langsamer (18 / 16 / 5 s), und der
   Sturm beginnt nach 5 statt 7 Minuten. Im Vier-Reiche-Gefecht entscheiden die Gegner auf „Schwer“ alle 5 s.
4. **Der Gegner wartet in der Einführung.** Solange die geführten Schritte von Mission 1 laufen, nimmt er kein
   Land mehr, sobald er ein Feld mehr hat als du. Ein Regeltest prüft das.

### Ergebnisse (60 Partien je Karte und Stufe, Siege und Median der Siegzeit)

| Karte | Stufe | stark 1,5 s | 3 s | Anfänger 5 s | Anfänger 8 s | Stapel |
|---|---|---|---|---|---|---|
| Mission 1 | Leicht | 60 in 2:13 | 60 in 3:05 | 60 in 4:01 | 60 in 6:54 | **24** in 8:43 |
| Mission 1 | Normal | 60 in 2:21 | 60 in 3:21 | 60 in 4:21 | 58 in 7:41 | **6** in 9:27 |
| Mission 1 | Schwer | 60 in 2:33 | 51 in 5:08 | 0 | 0 | 0 |
| Mission 2 | Leicht | 60 in 3:00 | 60 in 3:53 | 60 in 5:40 | 58 in 8:45 | **17** in 7:02 |
| Mission 2 | Normal | 60 in 3:09 | 60 in 4:09 | 60 in 6:16 | 18 in 11:57 | **10** in 7:54 |
| Mission 2 | Schwer | 60 in 3:36 | 51 in 9:21 | 0 | 0 | 0 |
| Mission 3 | Leicht | 60 in 3:00 | 60 in 3:24 | 60 in 7:18 | 53 in 9:36 | **8** in 8:44 |
| Mission 3 | Normal | 60 in 3:01 | 60 in 3:29 | 60 in 7:57 | 25 in 10:39 | 0 |
| Mission 3 | Schwer | 60 in 3:59 | 40 in 11:33 | 0 | 0 | 0 |
| Duell | Leicht | 60 in 2:14 | 60 in 2:55 | 58 in 4:06 | 57 in 7:02 | **14** in 9:26 |
| Duell | Normal | 60 in 2:25 | 59 in 3:13 | 58 in 4:41 | 50 in 8:36 | **1** in 10:46 |
| Duell | Schwer | 60 in 2:51 | 46 in 7:07 | 0 | 0 | 0 |
| Vier Reiche | Leicht | 60 in 3:22 | 60 in 4:27 | 58 in 6:51 | 53 in 9:16 | **3** in 11:05 |
| Vier Reiche | Normal | 60 in 3:45 | 60 in 5:16 | 55 in 8:05 | 25 in 11:08 | 0 |
| Vier Reiche | Schwer | 45 in 4:36 | 33 in 8:06 | 1 | 0 | 0 |

Erstes Durchspielen von Mission 1 (Anfänger 5 s, liest 20 Sekunden, Gegner hält Frieden bis die Festung fällt):
60 von 60 auf „Leicht“ (4:20) und „Normal“ (4:40), 0 von 60 auf „Schwer“.

### Abgleich

| Ziel | Ergebnis |
|---|---|
| Mission 1: Anfänger mit 5 s gewinnt mindestens 55 von 60, mit 8 s die Mehrheit | erreicht auf „Normal“: 60 und 58 |
| „Leicht“ ist wirklich leichter, auch in Mission 1 | erreicht: mit 8 s gewinnt der Anfänger auf „Leicht“ überall 53 bis 60 |
| Mission 2 und 3 mit demselben Maßstab, etwas anspruchsvoller | erreicht für 5 s (60 und 60 auf „Normal“). Mit 8 s reicht „Normal“ dort nicht mehr (18 und 25), dafür ist „Leicht“ da |
| **Stapel-Spieler bleibt bei 0** | **verfehlt auf „Leicht“, teils auf „Normal“.** Siehe unten |

### Der Preis: Stapeln gewinnt gegen langsame Gegner wieder

Gegen die langsamen Gegner gewinnt der Stapel-Spieler wieder: auf „Leicht“ 3 bis 24 von 60, auf „Normal“ 0 bis
10 von 60, auf „Schwer“ weiter 0. Er braucht dafür 7 bis 11 Minuten, also etwa doppelt so lange wie der
Anfänger, der richtig spielt, und gewinnt erst im Sturm. Der Grund: Ein Gegner, der selten befiehlt, bestraft
die leeren Felder hinter dem Stapel nicht mehr schnell genug.

Versucht und verworfen: Der Gegner verteidigt alle 3 Sekunden, auch wenn er langsam angreift. Das drückte die
Stapel-Siege nur wenig (Mission 1 „Leicht“ 24 → 15, Mission 2 „Normal“ 10 → 7) und machte es langsamen Spielern
deutlich schwerer (Duell „Normal“, Anfänger 8 s: 50 → 27; Vier Reiche „Normal“: 25 → 5).

### Was sonst anders ist

- **Partien ohne Mensch enden auf „Leicht“ und „Normal“ meist nicht mehr** in 15 Minuten (24 bis 57 von 60 ohne
  Sieger). Langsame Gegner beenden untereinander nichts. Im Spiel fällt das nur auf, wenn man selbst nichts tut.
- **Ein untätiger Spieler** überlebt jetzt viel länger: auf „Normal“ mindestens 10:03 (Mission 1), 6:40 (Mission
  2), 4:24 (Mission 3).
- **Zwischen „Normal“ und „Schwer“ liegt ein großer Schritt** (Gegner alle 10 gegen alle 3 Sekunden).

### Was gemessen ist und was nur vermutet

- Gemessen: alle Zahlen oben, mit dem committeten Stand.
- Vermutet: dass die Stellvertreter einem Menschen ähneln. Sie sind Programme. „Anfänger 5 s“ passt zu deiner
  Beschreibung, aber ein Mensch kann klüger oder ungeschickter spielen. Maßgeblich ist dein nächster Spieltest.
- Nicht geprüft: die Stufen im Browser gespielt; Zufallskarten mit anderen Startwerten als denen der Messung.

### Nachtrag · „Normal“ angezogen (Stand 0.7.1)

Deine Rückmeldung nach dem ersten Versuch mit Stand 0.7: Jetzt ist es zu leicht. „Normal“ liegt deshalb jetzt
zwischen der alten und der ersten neuen Einstellung. „Leicht“ und „Schwer“ sind unverändert.

| Wo | Stand 0.6 | Stand 0.7 | Stand 0.7.1 |
|---|---|---|---|
| „Normal“ allgemein: Gegner entscheidet | alle 1,6 s | alle 10 s | alle 8 s |
| Mission 1 auf „Normal“ | alle 2,2 s, Zuwachs 90 % | alle 12 s, Zuwachs 75 % | alle 7 s, Zuwachs 90 % |
| Mission 3 auf „Normal“ | alle 1,6 s | alle 16 s | alle 14 s |

Gemessen auf „Normal“ (60 Partien, Siege und Median der Siegzeit):

| Karte | 3 s | Anfänger 5 s | Anfänger 8 s | Stapel |
|---|---|---|---|---|
| Mission 1 | 60 in 3:42 | 56 in 6:31 (vorher 60 in 4:21) | 8 (vorher 58) | 0 (vorher 6) |
| Mission 2 | 60 in 4:27 | 57 in 7:45 (vorher 60 in 6:16) | 3 (vorher 18) | 5 (vorher 10) |
| Mission 3 | 60 in 3:33 | 56 in 8:40 (vorher 60 in 7:57) | 2 (vorher 25) | 0 |
| Duell | 60 in 3:20 | 57 in 5:15 (vorher 58 in 4:41) | 20 (vorher 50) | 0 (vorher 1) |
| Vier Reiche | 60 in 5:34 | 53 in 9:34 (vorher 55 in 8:05) | 9 (vorher 25) | 0 |

Was das heißt: Wer etwa alle 5 Sekunden einen Befehl gibt, gewinnt auf „Normal“ weiter meistens, braucht aber
anderthalb bis zwei Minuten länger und muss sich gegen einen Gegner wehren, der öfter angreift. Wer 8 Sekunden
braucht, verliert auf „Normal“ jetzt meist und ist auf „Leicht“ richtig. Nebenbei gewinnt der Stapel-Spieler
auf „Normal“ nur noch in Mission 2 (5 von 60).

Offen: Ob das für dich passt, ist nicht gemessen, sondern deine nächste Rückmeldung. Die Spanne zwischen „zu
schwer“ (alle 2,2 s) und „zu leicht“ (alle 12 s) ist groß; alle 7 s ist ein begründeter Mittelwert, kein
Beweis. Ist es weiter zu leicht, ist der nächste Schritt alle 5 bis 6 s (gemessen: Anfänger 5 s gewinnt dann
47 von 60 in 6:47).

## 15 · Tasten, Füllstand, verdeckte Zahlen, Menü (Stand 0.8, 19.11.2026)

Die beiden offenen Punkte unter „Danach“ und zwei offene Schwächen aus der Roadmap. Alles ist Darstellung und
Bedienung: An den Regeln ist nichts geändert, die Balance ist deshalb nicht neu gemessen.

| Was | Stand |
|---|---|
| Tasten am PC | gebaut und im Browser mit echter Maus und Tastatur geprüft. `S` stürmt das fremde Feld unter der Maus, genau so, wie die Vorschau es zeigt; ohne Vorschau passiert nichts. `T` baut einen Turm, `H` (englisch `F`) einen Hof: auf dem gewählten Feld, sonst auf dem eigenen Feld unter der Maus. Geht es nicht, steht der Grund am Feld („ab 21 Truppen“, „nur auf Wiese“, „Hier nicht möglich“). Die Taste steht klein oben links auf den Bauknöpfen, dazu eine Zeile in der Hilfe; beides nur an Geräten mit Maus |
| Füllstand | gebaut und im Bild gesehen. Unter der Zahl jedes eigenen Feldes füllt sich ein schmaler Streifen in Reichsfarbe von links, bis das Feld so viele Truppen hat, wie es versorgt. Voll: gelb wie die Zahl. Abgeschnitten: grau. Gegnerische und freie Felder haben keinen Streifen |
| Verdeckte Zahlen am Handy | behoben, siehe unten |
| Menü und Hilfe | auf breiten Bildschirmen zweispaltig. Bei 1280 × 720: Menü 570 statt 895 Punkte hoch, Hilfe 572 Punkte; vorher musste man bei beiden scrollen. Am Handy unverändert einspaltig |

### Verdeckte Zahlen am Handy

Gemessen mit einem neuen Messwerkzeug im Browser (`tools/overlap-probe.js`): Der Computer spielt auf deinem
Platz, gezählt wird in 600 Bildern je Karte (eins pro Spielsekunde), in wie vielen Ziffern auf anderen Ziffern
liegen. Zahlen über marschierenden Truppen zählen nicht mit: Sie reisen seit Stand 0.6 absichtlich fest mit
ihrer Truppe und ziehen dabei über andere Zahlen hinweg.

| Karte (Handy 375 × 812, „Normal“) | Bilder mit verdeckter Zahl vorher | jetzt | Angreiferzahl weggelassen |
|---|---|---|---|
| Mission 1 | 24 von 600 | 0 | 0 von 440 |
| Mission 2 | 33 von 600 | 0 | 1 von 380 |
| Mission 3 | 43 von 600 | 0 | 5 von 228 |
| Duell | nicht gemessen | 0 | 0 von 372 |
| Vier Reiche | nicht gemessen | 0 | 6 von 334 |

Am PC (1280 × 720) lag schon vorher keine Zahl auf einer anderen (Mission 2, Mission 3, vier Reiche, je 600
Bilder), jetzt auch nicht.

- **Ursache:** Die Zahl der Angreifer weicht den Feldzahlen aus. Am Handy stehen die Felder nur gut 30 Punkte
  auseinander; fand sie keinen freien Platz, blieb sie an ihrer Stelle liegen, oft auf einer Feldzahl.
- **Jetzt:** Sie darf den Rand eines anderen Schildes streifen, aber nie dessen Ziffern, den Füllstreifen oder
  den Rand eines umkämpften Feldes. Findet sie gar keinen Platz, fehlt sie in diesem Bild; Rand und Ansage
  zeigen den Kampf weiter. Außerdem bleibt sie an ihrem Platz, solange er frei ist, statt in jedem Bild die
  nächste Lücke zu suchen.
- **Warum es mehr war als in Stand 0.3** (damals Mission 2: 5 von 237 Bildern): vermutet, nicht gemessen. Seit
  Stand 0.4 brauchen Rand und Ansage an umkämpften Feldern zusätzlich Platz, und gezählt wurde anders.

### Tests

Sechs neue Tests, 58 insgesamt: vier für die Tasten (S nur mit Vorschau; S nimmt einen halb gegebenen
Doppeltipp zurück; Bauen auf gewähltem Feld oder unter der Maus, nie auf fremdem; nichts, solange keine Befehle
gehen), einer für den Streifen (halbe Truppen, halber Streifen; Burg 10 von 40 ein Viertel; voll gelb; keiner
auf gegnerischen Feldern), einer für verdeckte Zahlen (Felder 28 Punkte auseinander). Dieser scheitert mit der
alten Darstellung genau an der verdeckten Zahl.

### Geprüft und nicht geprüft

Geprüft im Browser bei 1280 × 720 mit echter Maus und Tastatur: `T` über einem eigenen Feld baut den Turm, `H`
nimmt einen Hof in Auftrag, `S` über einem fremden Feld mit der Vorschau „4× ✓ 30“ schickt alle vier Nachbarn,
`T` über der eigenen Burg zeigt „Hier nicht möglich“. Im Handy-Format sind Tastenbuchstaben und die Hilfezeile
zu den Tasten ausgeblendet. Keine Fehlermeldungen.

Nicht geprüft: am echten Handy; ob der Streifen dort gut zu sehen ist (er ist knapp drei Bildpunkte hoch);
die englischen Texte nur gelesen, nicht im Bild gesehen.

## 16 · Figurenschau und Ungeheuer als eigene Seite (19.11.2026)

Schritt 0 aus [INHALTE-PLAN.md](INHALTE-PLAN.md). Für Spieler ändert sich nichts: Die Figurenschau ist nicht im
Menü, und Karten ohne Ungeheuer laufen mit demselben Würfel Schritt für Schritt wie vorher.

### Grundlage „Wildnis“

- Ungeheuer sind eine eigene Seite hinter den Reichen. Sie gehört keinem Reich, greift jeden an und kann von
  jedem angegriffen werden. Sie kämpft nach denselben Kantenregeln, mit derselben Vorhersage.
- Ihre Felder wachsen nicht und schwinden nicht, auch nicht über die Versorgungsgrenze hinaus. Sie gelten
  nie als abgeschnitten.
- Ungeheuer können weder gewinnen noch verlieren. Nehmen sie eine Burg, fällt das Reich, und sein Land wird
  frei (jedes Feld behält ein Viertel seiner Truppen, wie sonst beim Erben). Ist es deine Burg, verlierst du,
  und niemand gewinnt. Auf der Zitadelle lassen sie für niemanden die Uhr laufen. Diese Regeln sind
  Startregeln; ob das Land frei werden soll, ist eine Frage an dich (Roadmap).
- Die Seite gibt es nur auf Karten mit Ungeheuern. In einer Karte setzt `!` hinter dem Feldbuchstaben ein
  Feld der Ungeheuer, zum Beispiel `.!:20` für eine Wiese mit 20. Kein Reich startet auf solchen Feldern.
- Farbe Violett für Feld, Rand, Zahl und Figuren. Die Figuren tragen ein dunkles Fell mit zwei spitzen
  Ohren statt eines Helms. Jede echte Figur aus dem Pool bekommt später ihr eigenes Modell.
- Seitenleiste, Anteilsbalken und Ereignisse nennen sie „WILDNIS“ (englisch „WILDS“). Das Ziel „noch n
  Burgen“ zählt sie nicht mit.

### Figurenschau

Erreichbar nur über den eigenen Link: an die Spieladresse `?schau` anhängen, also
`https://emfau88.github.io/Hex-Rework/?schau` (erst nach dem nächsten Hochladen) oder lokal
`http://localhost:4180/?schau`.

- Kleine Insel mit beiden Burgen und einem Ungeheuer-Feld (20) in der Mitte.
- Werkzeuge: **Befehle** (spielen wie sonst), **Wildnis**, die beiden Reiche, **Frei**. Mit einem der
  vier letzten setzt ein Tipp das Feld auf diese Seite, mit so vielen Truppen, wie die Zahl daneben sagt
  (1 bis 99). Burgen bleiben, wie sie sind. Ziehen verschiebt weiter die Karte.
- Zeit: anhalten, ¼, ½, 1 oder 3-fach, „+1 s“ (eine Sekunde weiter, dann wieder Stillstand). Leertaste hält
  an und startet.
- Werte des zuletzt angetippten Feldes. Bei Ungeheuern: Stärke, Angriff, Reichweite, Deckung, Vorhaben
  (jetzt: „hält sein Feld“ oder „wehrt sich“). Bei Reichen: Truppen, Zuwachs, Deckung, Kampf.
- Anders als im Spiel: Der Gegner spielt nicht, niemand schickt von selbst Nachschub, abgeschnittene Felder
  schwinden nicht (so bleibt stehen, was gesetzt wurde), es gibt keinen Sturm, und die Schau endet nie.
- Am PC steht die Leiste links neben der Insel, am Handy über ihr. Der Knopf oben links öffnet die Hilfe mit
  Neustart und Menü.

### Tests

Zwölf neue Tests, 70 insgesamt. Der wichtigste spielt jede bisherige Karte vier Minuten lang (je einmal mit
Computer gegen Computer auf „Schwer“ und mit untätigem Spieler auf „Normal“) und vergleicht den ganzen Zustand
mit einem Fingerabdruck, der vor dem Umbau aufgenommen wurde. Weitere: Ungeheuer wachsen und schwinden nicht;
die Vorhersage stimmt genau, wenn Ungeheuer verteidigen und wenn sie angreifen; Burg an Ungeheuer verloren
(Land frei, Partie geht weiter; eigene Burg: verloren, kein Sieger); Zitadelle; `!` in Karten; Computergegner
gegen Ungeheuer (Mission 1 mit Ungeheuern auf den Festungen, ohne Fehler; auf „Schwer“ greift er sie an, auf
„Leicht“ lässt er sie in fünf Minuten in Ruhe, wie gleich starke freie Hügel); Figurenschau; Eingabe in der
Figurenschau.

### Geprüft und nicht geprüft

Geprüft im Browser bei 1280 × 720 mit echten Klicks: Ungeheuer setzen (30 auf eine Wiese), eigene Truppen
auf drei Nachbarfelder, Sturm mit Doppeltipp. Vorschau „3× ✓ 30“; gemessen fiel das Feld genau nach den
vorhergesagten 2,4 Sekunden mit 30 Truppen. Zeitlupe ¼, Anhalten (die Uhr steht), „+1 s“ (genau eine
Sekunde), Leertaste, Neustart, zurück ins Menü. Danach ein normales Duell: Seitenleisten, Nachschub-Knopf und
Ziel wie vorher. Im Handy-Format (375 × 812): Leiste über der Insel, nichts verdeckt, Werte in drei Zeilen.
Keine Fehlermeldungen.

Nicht geprüft: am echten Handy; die englischen Texte nur gelesen; das Fell der Ungeheuer nur klein im Bild
gesehen.

## 17 · Figur 1: der Troll (19.11.2026)

Erste Figur aus dem Pool ([INHALTE-PLAN.md](INHALTE-PLAN.md)). Er steht nur in der Figurenschau, in keiner
Mission. Karten ohne Trollhöhle laufen mit demselben Würfel Schritt für Schritt wie vorher (Fingerabdruck-Test
aus Abschnitt 16, unverändert grün).

### Regeln

Alle Zahlen sind Startwerte in `src/sim/rules.js` (`troll`) und noch nicht auf Spielbalance gemessen.

- **Höhle:** Eine Trollhöhle ist ein Feld der Wildnis mit 30 Trollen (in der Karte auch mehr oder weniger).
  Anders als andere Felder der Wildnis wächst sie nach, 0,2 Trolle pro Sekunde, bis sie wieder voll ist.
- **Überfall:** Alle 50 Sekunden ziehen 8 Trolle gegen das schwächste Nachbarfeld eines Reichs (bei Gleichstand
  das erste in fester Reihenfolge). 10 Sekunden vorher wird das Ziel ausgewählt und markiert: violetter Ring auf
  dem Feld, pulsierender Pfeil, Meldung „Trolle rüsten zum Überfall auf …“ und, wenn es dein Feld ist, ein
  Warnton. Der Überfall geht genau auf das markierte Feld, auch wenn inzwischen ein anderes schwächer ist.
- **Über der Höhle** steht „Überfall n s“, umgerechnet auf das eingestellte Tempo. Ist die Höhle markiert, wird
  das Schild violett. Liegt kein Reich daneben, steht dort nichts.
- **Kein Überfall**, wenn kein Feld eines Reichs daneben liegt (freies Land wird nie überfallen), wenn das
  Ziel inzwischen kein Feld eines Reichs mehr ist, wenn die Höhle keinen vollen Trupp entbehren kann (einer
  bleibt immer zurück) oder wenn die Höhle angegriffen wird oder ein Angriff auf sie unterwegs ist. Dann
  verteidigen die Trolle ihr Zuhause. Der nächste Überfall kommt jeweils 50 Sekunden später.
- **Erobertes Feld:** Ein Feld, das die Trolle nehmen, wird ein Feld der Wildnis mit Troll-Figuren. Es ist
  keine Höhle: Es wächst nicht und überfällt niemanden.
- **Höhle erobert:** Nimmt ein Reich die Höhle, ist sie erledigt. Das Feuer geht aus, die Höhle bleibt als
  Kulisse stehen, und das Feld ist ein normales Feld des Reichs. Meldung „… nimmt die Trollhöhle“.
- **Vorhersage:** Auch eine Höhle, die während des Kampfs nachwächst, fällt genau so, wie der Pfeil es
  vorhersagt. Weil niemand eine angegriffene Höhle verlässt, bleibt die Vorhersage auch kurz vor einem
  Überfall genau.
- **Karten:** `!t` hinter dem Feldbuchstaben setzt eine Trollhöhle, zum Beispiel `.!t` (30) oder `.!t:40`.
  Ein unbekannter Buchstabe wird abgelehnt.

### Im Bild

- Troll: graugrün, kantig, gebückt, mit Hauern, leuchtenden Augen, langen Armen und einem Lendenschurz in
  der Farbe seiner Seite. Die Keule schleift er hinter sich her. Bis zu 3 Trolle vor der Höhle, auf dem Marsch
  und an der Kante; je Troll stehen etwa 12 Truppen am Rand.
- Höhle: Felsen mit dunklem Eingang, Steinpfosten, Knochen davor, Lagerfeuer mit Flackern rechts davor.
- Figurenschau: neues Werkzeug „Troll“ setzt eine Höhle mit so vielen Trollen, wie die Zahl sagt. Die Insel
  startet mit einer Höhle in der Mitte und einem kleinen blauen Feld daneben. Werte der Höhle: Stärke (n / 30),
  Nachwuchs, Angriff („8 alle 50 s“), Reichweite („Nachbarfelder“), Deckung, Vorhaben („Überfall in n s“,
  „überfällt AZUR in n s“, „kein Reich daneben“, „wehrt sich“).

### Nebenbei: Kampfanimation

Bei der Frage, ob Verteidiger vor dem Kampf umfallen, fiel mir zweierlei auf: Die vorderste Figur eines
Verteidigers kippte schon auf dem Weg zur Kante etwas, und Verteidiger drehten sich manchmal über den langen Weg
zum Angreifer. Jetzt kippt sie erst, wenn sie an der Kante ankommt, und dreht sich auf dem kürzeren Weg. Das
betrifft nur das Bild, nicht den Kampf.

### Tests

Neun neue Tests, 79 insgesamt: Höhle wächst bis zu ihrer Größe; Überfall markiert das schwächste Feld und geht
genau dorthin; kein Überfall ohne Ziel, ohne vollen Trupp oder wenn das Ziel kein Reichsfeld mehr ist;
Vorhersage genau bei einer nachwachsenden Höhle und bei einem Angriff kurz vor dem Überfall; Höhle erobert;
Kartenzeichen; Figurenschau; Computergegner gegen Trollhöhlen (Mission 1 mit Höhlen auf den beiden Festungen,
auf „Leicht“ und „Schwer“, ohne Fehler, nur ein Reich kann gewinnen, die Trolle überfallen mindestens einmal).

### Geprüft und nicht geprüft

Geprüft im Browser bei 1280 × 720 in der Figurenschau: Schild „Überfall 50 s“ über der Höhle; nach 40 Sekunden
Ring, Pfeil und Meldung auf dem blauen Feld daneben; bei 50 Sekunden ziehen die Trolle los, kämpfen an der Kante
und nehmen das Feld (auf 3 Truppen gesetzt), das Feld wird violett mit einem Troll. Ein Feld mit 20 Truppen
hielt den Überfall dagegen. Werte der Höhle; Werkzeug „Troll“; eine Höhle ohne Reich daneben zeigt kein Schild
mehr (Fehler beim Prüfen gefunden und behoben); Azur erobert eine Höhle: Feuer aus, Höhle bleibt, blaue
Soldaten davor. Im Handy-Format (375 × 812): sechs Werkzeuge in einer Zeile, Werte in drei Zeilen. Keine
Fehlermeldungen.

Nicht geprüft: am echten Handy; Bewegung nur in Standbildern gesehen; die englischen Texte nur gelesen; ob die
Startwerte (30 Trolle, 8 alle 50 s, 10 s Vorwarnung) Spaß machen; ob der Computergegner gezielt gegen Höhlen
spielt (er behandelt sie wie andere Felder der Wildnis).
