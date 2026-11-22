# Rundenmodus · Ideensammlung und Prüfweg

Stand 22.11.2026 · Zweig `runden` · **Nichts in dieser Datei ist gebaut oder beschlossen.**

Diese Datei sammelt alle Ideen für den Ausbau des Rundenmodus an einem Ort und legt fest, wie wir herausfinden,
welche davon taugen. Sie ergänzt zwei andere Pläne:

- [RUNDEN-PLAN.md](RUNDEN-PLAN.md): die geltenden Regeln, was gebaut ist, alle Messungen.
- [INHALTE-PLAN.md](INHALTE-PLAN.md): der Figurenpool (Troll, Steinriese, Drache, Ritter und so weiter) im
  Einzelnen. Die Figuren stehen dort, hier steht nur, wie sie in den Rundenmodus passen.

**Kennungen:** Jede Idee hat ein Kürzel (zum Beispiel `U4` oder `F6`). So kannst du im Gespräch kurz sagen, was
dir gefällt.

## 1 · Was das Audit gemessen hat (22.11.2026)

Gemessen auf Stufe Normal, 20 Karten je Variante, ein Würfelsatz, Computer gegen Computer und mit den beiden
Testspielern. Das ist grob: Unterschiede von wenigen Partien können Zufall sein. Die Gegner wurden für die
Varianten nicht neu abgestimmt. Nachmessen: Abschnitt 7.

### Wie das Spiel heute läuft

| Messwert | Ergebnis |
|---|---|
| Ende der Partie (Mitte) | Duell Zug 37 · Mission 1 Zug 23 · Mission 2 Zug 57 · Mission 3 Zug 49 · Vier Reiche Zug 48 |
| Partien mit Sieger | Duell 38 von 40 · Mission 2 nur 5 von 40 · Mission 3 54 von 60 · Vier Reiche 57 von 80 |
| Truppen, die pro Zug angreifen (ab Zug 20) | 7 bis 13 % aller eigenen Truppen, bei über 45 Feldern nur 4 bis 6 % |
| Zuwachs, der an vollen Feldern verfällt (ab Zug 20) | 18 bis 41 %, meist ein Viertel bis ein Drittel |
| Besitzwechsel, die binnen 2 Zügen zurückgeholt werden | 51 bis 59 %, in Mission 2 über 80 % (rund 300 Wechsel je Partie) |
| Wer nach Zug 20 mehr Felder hat, gewinnt | 85 bis 89 % |
| Wer 60 % aller Felder zwei Züge lang hält, gewinnt | immer (Duell 36 von 36); die Partie läuft danach noch 8 bis 14 Züge |
| Befehle des Computers nach Zug 20 | fast nur Angriff; Bauen 0,03 bis 0,15 je Zug, Verschieben 0,00 |
| Mission 3, Siege der Testspieler | 0 von 20 und 0 von 20 |

### Regeln im Rechner probiert

Ende der Partie in Zügen (Mitte). In Klammern: Partien mit Sieger in Mission 2.

| Variante | Duell | Mission 2 | Vier Reiche | Nebenwirkung |
|---|---|---|---|---|
| heute | 37 | 57 (5 von 40) | 48 | |
| Befehle wachsen mit dem Reich (3, dazu 1 je 12 Felder, höchstens 6) | 20 | 19 (38) | 25 | wer beginnt, gewinnt im Duell 70 % statt 63 % |
| 5 Befehle fest | 19 | 22 (36) | nicht gemessen | wer beginnt, gewinnt 85 % |
| Gratisbefehl nach einer Eroberung von 2 Seiten (einmal je Zug) | 27 | 41 (13) | 34 | wer beginnt, gewinnt 72 % |
| Frisch erobertes Feld hat einen Zug lang Deckung (+60 %) | 32 | 49 (4) | 37 | Hin und Her sinkt von 55 auf 45 %, in Vier Reiche von 51 auf 40 % |
| Feldgrenze 30 statt 20 (Zitadelle 40, Burg 50) | 30 | 35 (38) | nicht gemessen | wer beginnt, gewinnt 78 % |
| Verfallener Zuwachs kommt als Truppen an die Front (bis 30 auf einmal) | 36 | 53 (24) | 41 | 450 bis 1000 Zusatztruppen je Partie, kaum Wirkung |
| Breitere Kanten (12 statt 8 Angreifer) | 37 | 51 (27) | nicht gemessen | |
| Wachsende Befehle (1 je 15 Felder, höchstens 5) und Deckung zusammen | 20 | 22 (38) | 26 | Mission 3: Ende Zug 32, Testspieler gewinnen weiter nur 1 bis 2 von 20 |

### Was daraus folgt

1. **Der Engpass sind die Befehle.** Ein großes Reich hat viele Truppen, kann aber nicht mehr tun als ein
   kleines. Nicht die Kartengröße, nicht die Grenze von 20 und nicht die Truppenzahl bremsen.
2. **Mehr Truppen helfen fast nicht.** Auch breitere Kanten allein wirken kaum.
3. **Eroberungen halten nicht.** Ein frisch erobertes Feld ragt in die gegnerische Linie und wird von mehr
   Seiten zurückgeholt (gemessen 1,8 bis 2,0 Kanten gegen 1,4 bis 1,6 bei anderen Eroberungen).
4. **Partien sind früh entschieden und spät zu Ende.**
5. **Nach Zug 20 gibt es praktisch nur noch einen Befehl.** Es fehlt etwas, das man im Lauf der Partie aufbaut.
6. **Mission 3 ist ein Problem der Mission,** nicht der Grundregeln: zwei Gegner gegen einen.
7. **Alles, was Partien schneller macht, stärkt den, der beginnt.** Das braucht einen Ausgleich.

### Bedingungen für jede neue Idee

- Sie bringt **Tempo** oder **bricht eine Regel**. Bloß mehr Stärke wirkt gemessen kaum.
- Der Computergegner kann sie spielen, oder sie folgt festen, einfachen Regeln (Ungeheuer).
- Die Vorschau bleibt ehrlich: Was sie zeigt, tritt genau so ein.
- Sie ist am Handy lesbar. Wenige Figuren, klare Zeichen.
- Gefahren sind angekündigt (Leitlinie 4 aus dem Figurenplan).

## 2 · Dein Eindruck (22.11.2026)

- Der Rundenmodus ist ruhiger und interessant. Mission 1 geht gut, Mission 2 ist zäh.
- Die Reparaturen aus dem Audit (wachsende Befehle, Deckung, Sieg durch Übermacht) klangen zuerst langweilig.
- Der **Feldherr** ist „nicht schlecht“.
- **Nicht immer gegen eine genau gleiche Armee** spielen, sondern auch gegen Bosse und Wildnis: klingt gut, in den
  Missionen variieren.
- **Besondere Einheiten** hören sich gut an. Die ersten drei Vorschläge (Ramme, Reiter, Riese) gefallen dir noch
  nicht ganz.
- Interessant: Monster, Höhlen, Bosse, Fähigkeiten besiegter Monster, Held, Zauber, andere Fraktionen.
- Offen: Wie finden wir heraus, was das Richtige ist? Darum geht es in Abschnitt 3.

## 3 · So finden wir heraus, was taugt

Grundsatz: nicht lange abwägen, sondern billig ausprobieren. Der Rechner kann 60 Partien spielen, aber keinen
Spaß messen. Du kannst Spaß beurteilen, aber keine 60 Partien spielen. Deshalb braucht jede Idee beides.

| Stufe | Was passiert | Dauer | Wer |
|---|---|---|---|
| 1 · Karte | Die Idee steht hier in einer Zeile: was man tut, welches gemessene Problem sie trifft | Minuten | Claude |
| 2 · Bauchprobe | Du liest eine Gruppe und nennst die Kürzel, die du spielen willst, und die, die dich kaltlassen | Minuten | du |
| 3 · Rechnerprobe | Die Regel läuft als Variante im Rechner, ohne das Spiel zu ändern: 60 Partien, zwei Würfelsätze | Stunden bis ein Tag | Claude |
| 4 · Spielprobe | Spielbar auf einer Karte der Testversion, deutlich als Probe markiert. Du spielst 2 bis 3 Partien | Tage | beide |
| 5 · Einbau | Erst jetzt in Missionen, mit Abstimmung je Stufe | Tage bis Wochen | Claude |

**Regeln für den Weg**

- Immer nur **eine neue Idee je Probe.** Sonst weiß man nicht, was gewirkt hat.
- Jede Probe hat vorher ein **Abbruchkriterium.** Wer es reißt, fliegt zurück auf den Stapel, mit Grund.
- Was durchfällt, bleibt mit dem Grund in dieser Datei stehen, damit wir es nicht zweimal probieren.

**Grenzen der Rechnerprobe** (Duell, Normal; für andere Karten sinngemäß)

- Ende der Partie in der Mitte bei Zug 20 bis 28.
- Mindestens 90 % der Partien haben einen Sieger.
- Wer beginnt, gewinnt höchstens 60 bis 65 %.
- Die Testspieler gewinnen nicht plötzlich alles oder nichts mehr.

**Deine vier Fragen nach jeder Spielprobe** (immer dieselben)

1. Hatte ich eine Entscheidung, die ich vorher nicht hatte?
2. Gab es einen Moment, auf den ich hingefiebert habe?
3. War etwas unklar oder lästig?
4. Würde ich es vermissen, wenn es wieder weg wäre?

## 4 · Vorschlag für die Reihenfolge der Proben

Die Reihenfolge ist ein Vorschlag. Deine Bauchprobe darf sie umstellen.

| Probe | Was | Warum an dieser Stelle | Stand |
|---|---|---|---|
| P0 · Fundament | Tempo für große Reiche (als Kriegsdruck `D3` oder als wachsende Befehle `C1`), Halt für Eroberungen (`N1`), Sieg durch Übermacht (`N2`) | Solange Partien 50 Züge dauern, verfälscht das jede andere Probe | Rechnerprobe gemacht (Abschnitt 1), Spielprobe fehlt |
| P1 · Wildnis | Der Troll mit angekündigten Überfällen auf einer Karte (`F5`, `F6`) | Die billigste spannende Probe: Figur und Höhle gibt es schon. Trifft „nicht immer dieselbe Armee“ | Der Ablauf des Trolls läuft nur in Echtzeit und braucht eine Fassung für Züge |
| P2 · Trophäe | Wer die Höhle nimmt, bekommt etwas (`A7`) | Klein, baut auf P1 auf, gibt Ziele abseits der Front | offen |
| P3 · Erste Einheit | Eine Einheit durch Verwandeln (`A1`), ausgewählt nach deiner Bauchprobe aus den Kandidaten `U1` bis `U12` | Dein besonderes Interesse; braucht P0, damit Tempo überhaupt zählt | offen, Auswahl fehlt |
| P4 · Boss | Eine Mission gegen einen Boss (`F7`, `G3`), zum Beispiel den Steinriesen | Zeigt, ob eine Mission ohne gleichartigen Gegner trägt | offen |
| P5 · Held und Zauber | Eine Figur mit einer Fähigkeit (`B1`, `B2`), bezahlt mit Kriegsdruck (`E2`) | Größter Eingriff in die Bedienung, deshalb spät | offen |
| P6 · Anderer Gegner | Ein Gegner mit eigenen Regeln, zum Beispiel ein Pilz, der sich ausbreitet (`F2`) | Am teuersten, lohnt erst, wenn P1 und P4 Spaß machen | offen |

## 5 · Alle Ideen

**Herkunft:** D = Diskussion vom 22.11.2026 (dein Briefing) · A = Audit · F = Figurenplan.

**Status:** *Probe geplant* (steht in Abschnitt 4) · *offen* (noch nicht eingeordnet) · *später* (erst nach
anderen Proben sinnvoll) · *vorerst nein* (mit Grund; kann wiederkommen).

Die Einschätzungen sind Meinung, außer wo „gemessen“ steht.

### 5.1 · Einheiten, Verwandeln, Entwicklung

| Kürzel | Idee | Herkunft | Einschätzung | Status |
|---|---|---|---|---|
| `A1` | Truppen zu einer besonderen Einheit verwandeln, zum Beispiel 15 bis 20 Truppen eines Felds | D, F | Die beste spannende Richtung. Die Einheit muss Tempo bringen oder eine Regel brechen | Probe geplant (P3) |
| `A2` | Verschiedene Arten: Belagerung, Beweglichkeit, Verteidigung, Zuwachs, Magie | D | Ja, aber mit zwei oder drei Arten anfangen. Kandidaten: `U1` bis `U12` | offen, Bauchprobe |
| `A3` | Mehrere Stufen und Entwicklungspfade | D | Erst wenn die erste Stufe Spaß macht. Jede Stufe muss der Computergegner spielen können | später |
| `A4` | Einheiten dauerhaft behalten oder nur für einige Züge beschwören | D | Beides geht. Auf Zeit ist leichter abzustimmen; dauerhaft gibt mehr Bindung | offen |
| `A5` | Eliteeinheit als eigene Figur neben der Truppenzahl des Felds | D, A | Ja, als Figur auf einem Feld. Höchstens 2 bis 3 je Reich, sonst wird die Karte unlesbar | Probe geplant (P3) |
| `A6` | Ein mächtiges Geschöpf erschaffen, indem man mehrere Felder oder sehr viele Truppen opfert | D | Reizvoll als seltener Höhepunkt. Risiko: Wer vorn liegt, kann es sich leisten | später |
| `A7` | Fähigkeiten besiegter Ungeheuer übernehmen | D | In einfacher Form gut: Wer die Höhle nimmt, bekommt eine Einheit dieser Art | Probe geplant (P2) |
| `A8` | Feldherr: eine Figur, die jede Runde einen eigenen Angriff von ihrem Feld aus mitbringt | A | Die nüchterne Grundform von `A1`. Macht Zusatzbefehle sichtbar und angreifbar | offen, Grundlage für `U1` bis `U12` |

**Kandidaten für Einheiten** (alle Vermutung, keine ist gemessen). Welche gefallen dir?

| Kürzel | Einheit | Was sie kann | Trifft welches Problem |
|---|---|---|---|
| `U1` | Ramme | Deckung durch einen Turm zählt an ihrer Kante nicht | Verkeilte Pässe (Mission 2) |
| `U2` | Reiter | Nach einem gewonnenen Angriff sofort ein zweiter, ohne Befehl | Tempo |
| `U3` | Riese | Zählt als zusätzliche Kante beim Umzingeln | Felder, die man nur von einer Seite erreicht |
| `U4` | Katapult | Schwächt ein Feld in zwei Schritten Entfernung, ohne es zu nehmen | Alles-oder-nichts beim Angriff |
| `U5` | Saboteur | Ein gegnerisches Feld bekommt einen Zug lang keinen Nachschub | Der Verteidiger füllt gratis nach |
| `U6` | Garde | Ihr Feld kann einen Zug lang nur von einer Seite angegriffen werden | Eroberungen halten nicht |
| `U7` | Bannerträger | Sein Feld und die Felder daneben nähren 30 statt 20 Truppen | Verfallener Zuwachs, Aufmarsch vor einem Stoß |
| `U8` | Greifenreiter | Greift ein Feld im Umkreis von drei Schritten an, auch über Gebirge und Wasser | Zweite Front, Engpässe |
| `U9` | Feldscher | Die Hälfte der Gefallenen eines verlorenen Angriffs kehrt zurück | Erlaubt gewagte Angriffe, bringt Risiko ins Spiel |
| `U10` | Baumeister | Baut einmal je Zug ohne Befehl in seiner Nähe | Bauen hört nach Zug 20 auf |
| `U11` | Trollhorde (Trophäe) | Überfällt von selbst und angekündigt alle paar Züge ein Nachbarfeld des Gegners | Tempo ohne eigenen Befehl |
| `U12` | Koloss | Ein großer Brocken mit eigener Stärke; sein Feld fällt erst, wenn er besiegt ist | Bewegliche Festung, hält einen Keil |

Der Ritter aus dem Figurenplan („12 statt 8 Angreifer an der Kante“) wäre nach der Messung zu schwach: Breitere
Kanten überall änderten im Duell nichts. Er bräuchte ein Können wie `U2` oder `A8`.

### 5.2 · Helden und Fortschritt über Missionen

| Kürzel | Idee | Herkunft | Einschätzung | Status |
|---|---|---|---|---|
| `B1` | Ein eigener Held neben den Armeen | D, F | Ja, als eine Figur mit Gesicht. Im Kern ein Feldherr (`A8`) mit einer Fähigkeit | Probe geplant (P5) |
| `B2` | Helden mit verschiedenen Fähigkeiten und Rollen | D | Ja: Vor der Mission einen von mehreren wählen. Das gibt Abwechslung ohne mehr Stärke | Probe geplant (P5) |
| `B3` | Erfahrung, Stufen, Ausrüstung, Talentbäume | D | Macht jede Mission unabstimmbar: Niemand weiß, wie stark der Spieler ankommt. Lädt zum Abgrasen ein | vorerst nein |
| `B4` | Heldenentwicklung über Missionen speichern | D | Nur als freigeschaltete Auswahl (`B5`), nicht als wachsende Werte | vorerst nein |
| `B5` | Neue Fähigkeiten und Spielstile freischalten statt Zahlen erhöhen | D | Ja. Das ist der richtige Fortschritt für dieses Spiel | später |
| `B6` | Verwundung, Gefangennahme, Rettungsmissionen | D, F | Gefangennahme passt gut (Figurenplan: retten, dann kommt die Figur mit) | später |
| `B7` | Helden an Fronten binden, ohne mehr Kleinarbeit | D | Ja: Der Held zieht mit dem Angriff mit, kein eigener Bewegungsbefehl | Teil von P5 |
| `B8` | Statt dauerhafter Aufrüstung: Verbesserungen nur für einen Durchlauf (1 aus 3 nach jeder Karte) | D, A | Der bessere Ort für Fortschritt, gehört zur Richtung „Feldzug“ (`R3`) | später |

### 5.3 · Befehle und Automatik

| Kürzel | Idee | Herkunft | Einschätzung | Status |
|---|---|---|---|---|
| `C1` | Mehr Befehle mit wachsendem Reich | D | **Gemessen: stärkster Hebel** (Mission 2 endet in Zug 19 statt 57). Als bloße Zahl aber trocken | Probe geplant (P0), Alternative zu `D3` |
| `C2` | Aktionspunkte: kleine und große Aktionen kosten verschieden viel | D | Mehr Rechnen pro Zug, am Handy schwer zu lesen. Der Gewinn gegenüber `C1` ist unklar | vorerst nein |
| `C3` | Eine kostenlose Truppenverlegung pro Runde | D | Plausibel: Der Computer nutzt Verschieben nie (gemessen 0,00), ein Mensch vielleicht schon. Nicht messbar ohne dich | offen, billige Spielprobe |
| `C4` | Frontbefehl: mit einem Befehl mehrere abgestimmte Angriffe | D | Gleiches Tempo wie `C1` mit weniger Tippen, aber weniger genau. Erst prüfen, wenn `C1` zu viel Tipperei ist | später |
| `C5` | Selbstständige Armeen mit einem langfristigen Ziel | D | Nimmt dir die Entscheidungen ab, um die es im Spiel geht | vorerst nein |
| `C6` | Automatische Grenzverteidigung, kleine Scharmützel von selbst | D | Macht das Hin und Her unsichtbar statt es zu beheben | vorerst nein |
| `C7` | Kostenloser Folgeangriff nach einem Durchbruch | D | **Gemessen: mittlere Wirkung** (Duell Zug 27, Mission 2 Zug 41). Belohnt Umzingeln. Gut als Können einer Einheit (`U2`) | offen |
| `C8` | Felder zu Provinzen zusammenfassen | D | Großer Umbau; die Kanten zwischen einzelnen Feldern sind der Kern des Spiels | vorerst nein |

### 5.4 · Überschuss und neue Mittel

| Kürzel | Idee | Herkunft | Einschätzung | Status |
|---|---|---|---|---|
| `D1` | Überschuss wird zu einer Kriegsreserve aus Truppen | D | **Gemessen: kaum Wirkung,** wenn die Reserve nur Truppen sind (Duell Zug 36 statt 37) | vorerst nein in dieser Form |
| `D2` | Reserve für Einheiten, besondere Aktionen, Verbesserungen ausgeben | D | Ja: Das ist `D3` mit einer kleinen Auswahl | Teil von P0 und P5 |
| `D3` | Kriegsdruck: Verfallener Zuwachs füllt eine sichtbare Leiste. Wer sie einlöst, hat einen großen Zug mit mehr Befehlen | D, A | Dieselbe Rechnung wie `C1`, aber mit einem Moment, auf den man hinspielt und den der Gegner kommen sieht. Die Leiste hat eine feste Obergrenze, damit große Reiche nicht davonziehen | Probe geplant (P0) |
| `D4` | Forschungs- oder Entwicklungspunkte aus ungenutztem Zuwachs | D | Eine zweite Währung neben `D3` wäre zu viel. Wenn, dann schaltet `D3` auch Einheiten frei | später |
| `D5` | Feldgrenzen oder Zuwachs gezielt aufrüsten | D | **Gemessen:** Grenze 30 überall verkürzt Partien, stärkt aber stark den, der beginnt (78 %). Örtlich durch eine Einheit (`U7`) reizvoller | offen |
| `D6` | Neue Gebäude mit echter Aufgabe | D | Ja, wenige. Kandidaten: Kaserne (hier entstehen Einheiten), Wachfeuer (zeigt Ankündigungen früher), Lager (sammelt Überschuss der Nachbarn) | offen |
| `D7` | Einheiten oder Mittel zwischen Fronten teleportieren | D | Verschieben geht schon beliebig weit durch eigenes Land. Mehr hebt die Wirkung des Abschneidens auf | vorerst nein |
| `D8` | Überschuss fließt von selbst in Rekrutierung oder Verwandlung | D | Bequem, nimmt aber die Entscheidung weg. Besser: Die Leiste füllt sich von selbst, das Einlösen entscheidest du | Teil von `D3` |

### 5.5 · Zauber und Fähigkeiten

| Kürzel | Idee | Herkunft | Einschätzung | Status |
|---|---|---|---|---|
| `E1` | Belagerungsfähigkeit gegen stark befestigte Felder | D | Ja, trifft Mission 2 direkt. Als Einheit (`U1`) oder als Zauber | offen |
| `E2` | Zauber: Erdbeben, Meteorit, Sabotage, Schutz, Flächenangriff | D, F | Ja als zwei oder drei Wirkungen, die Kriegsdruck (`D3`) kosten. Kandidaten: Erdbeben (ein Feld verliert einen Zug lang seine Deckung), Schutz (ein Feld hält einen Zug sicher), Sabotage (wie `U5`) | Probe geplant (P5) |
| `E3` | Zufällig angebotene Karten pro Runde | D | Eine eigene Bedienebene und Zufall in einem Spiel, das von der sicheren Vorschau lebt. Der Computergegner müsste sie auch spielen | vorerst nein |
| `E4` | Gegenzauber und angekündigte Angriffe | D, F | Ankündigen ja, das ist schon Leitlinie. Gegenzauber erst, wenn es Zauber gibt | später |
| `E5` | Gelände dauerhaft verändern: Berge zerstören, Wasser schaffen, Wege öffnen | D | Ändert Wege, Abschneiden und die Planung der Gegner zugleich; schwer lesbar. Als festes Ereignis einer Mission denkbar (`G10`) | vorerst nein |
| `E6` | Seuchen, Flüche, Verderbnis, die Nachbarfelder befallen | D | Gut als Regel eines Gegners (`F2`, `F4`), nicht als Zauber des Spielers | später |
| `E7` | Fähigkeiten als Belohnung für Heldenentwicklung oder Bosse | D | Ja, als Trophäe (`A7`) oder freigeschaltete Auswahl (`B5`) | später |

### 5.6 · Gegner: Wildnis, Bosse, Fraktionen

| Kürzel | Idee | Herkunft | Einschätzung | Status |
|---|---|---|---|---|
| `F1` | Königreiche mit verschiedenen Eigenschaften bei Zuwachs und Kampf | D, F | Als Gegner, die je eine Regel brechen (Figurenplan: Nomaden, Horde, Clans, Seeräuber). Billiger als ganze Völker | später |
| `F2` | Pilz oder Schwarm, der Felder befällt und sich ausbreitet | D | Guter erster „anderer Gegner“: folgt festen Regeln, braucht keinen klugen Planer | Probe geplant (P6) |
| `F3` | Maschinen mit Fabriken und schweren Konstrukten | D | Viel neue Darstellung und Regeln auf einmal | später |
| `F4` | Schatten, die abgeschnittene Felder übernehmen | D | Passt gut zur Regel „abgeschnitten“. Klein zu bauen, wenn es `F2` gibt | später |
| `F5` | Neutrale Ungeheuer, die nicht wie ein Königreich spielen | D, F | Ja. Grundlage „Wildnis“ gibt es im Echtzeitkern, mit Figuren und eigener Farbe | Probe geplant (P1) |
| `F6` | Höhlen, die regelmäßig Ungeheuer hervorbringen | D, F | Ja. Der Troll ist gebaut. Skizze für Züge im Rundenplan: Überfall alle 5 Züge, einen Zug vorher angekündigt | Probe geplant (P1) |
| `F7` | Bosse mit eigenen Angriffen, Bewegungen und Schwachstellen | D, F | Ja. Der Steinriese aus dem Figurenplan ist ein fertiger Entwurf: ortsfest, nur durch Einkreisen zu fällen | Probe geplant (P4) |
| `F8` | Gegner mit ganz anderen Siegbedingungen | D | Folgt aus `F2` und `F7` von selbst (der Pilz gewinnt, wenn er deine Burg erreicht) | später |

**Die Figuren aus dem Figurenplan im Rundenmodus** (Einschätzung, nichts gemessen)

| Figur | Passt in Züge? |
|---|---|
| Troll | gut; braucht einen eigenen Zug der Wildnis und einen Zähler in Zügen |
| Steinriese | sehr gut; ein Boss, der das Umzingeln verlangt |
| Wolfsrudel | gut; „man sieht, wohin es als Nächstes zieht“ ist in Zügen noch klarer |
| Drache | gut; Skizze im Rundenplan: alle 6 Züge das stärkste Feld, einen Zug Vorwarnung |
| Ritter | ja, mit anderem Können (siehe 5.1) |
| Riesenspinne | gut; gesperrte Kanten sind in Zügen leicht zu lesen |
| Totenbeschwörer | möglich; als Gegner, der aus verlorenen Angriffen wächst |
| Greif | schlecht; er greift marschierende Truppen an, und in Zügen marschiert niemand. Neu denken, zum Beispiel wie `U8` |
| Magierin | ja, das ist `B2` mit `E2` |
| Krake | möglich, wenn Küsten in einer Mission wichtig sind |

### 5.7 · Missionsarten und Karten

| Kürzel | Idee | Herkunft | Einschätzung | Status |
|---|---|---|---|---|
| `G1` | Höhlen zerstören, bevor die Gegner überhandnehmen | D | Ja, folgt aus P1 | später |
| `G2` | Eine Festung gegen Angriffswellen halten | D | Ja; mit angekündigten Wellen eine gute Mission ohne gleichartigen Gegner | später |
| `G3` | Einen riesigen Boss besiegen | D | Ja | Probe geplant (P4) |
| `G4` | Einen Konvoi über die Karte geleiten | D | Braucht eine Figur, die über Felder zieht; möglich nach dem Wolfsrudel | später |
| `G5` | Zitadelle oder mehrere Punkte halten | D | Gibt es als Mission 3. Mehrere Punkte wären ein guter Ersatz für „alle Burgen“ | offen |
| `G6` | Zwischenziele mit Belohnung während der Partie | D | Ja, das sind die Trophäen (`A7`) | Teil von P2 |
| `G7` | Bewegliche Basis, wandernde Festung | D | Hebt Versorgung und Abschneiden aus den Angeln | vorerst nein |
| `G8` | Gegnerische Gebiete durch Sabotage, Aufstand oder Abschneiden übernehmen | D | Abschneiden gibt es. Aufstand als Folge langer Abschneidung wäre eine kleine, passende Regel | offen |
| `G9` | Die Karte wird im Lauf der Partie kleiner | D | Könnte den unsichtbaren Sturm ersetzen: sichtbar, räumlich, zwingt zur Mitte. Ungeprüft | offen |
| `G10` | Bewegliche oder zerstörbare Geländeteile | D | Als festes, angekündigtes Ereignis einer Mission (eine Brücke fällt in Zug 12), nicht als freie Aktion | später |
| `G11` | Kürzere Karten mit dichterem Spiel | D, A | Ja. Mission 1 und Duell (56 Felder) enden früher als Mission 2 (92 Felder) | offen |
| `G12` | Wiederverwendbare Vorlagen mit erzeugten Abwandlungen | D | Ja, sobald zwei oder drei Missionsarten stehen. Die Zufallsinsel gibt es schon | später |

### 5.8 · Neue Regeln aus dem Audit

| Kürzel | Idee | Einschätzung | Status |
|---|---|---|---|
| `N1` | Ein frisch erobertes Feld hat bis zum eigenen nächsten Zug Deckung | **Gemessen:** weniger Hin und Her (55 auf 45 %), Duell endet in Zug 32 statt 37; Mission 2 unverändert | Probe geplant (P0) |
| `N2` | Sieg durch Übermacht: Wer 60 % aller Felder zwei Züge lang hält, gewinnt | **Gemessen:** hätte in keiner Partie den Falschen gekrönt und spart 8 bis 14 Züge | Probe geplant (P0) |
| `N3` | Ausgleich für den, der nicht beginnt | Nötig, sobald Partien schneller werden. Wie, ist offen (mehr Starttruppen, ein Befehl mehr im ersten Zug) | offen |
| `N4` | Mission 3: die Gegner bekommen 2 Befehle, oder die Karte hetzt sie zuerst aufeinander | Ideen stehen im Rundenplan, Abschnitt 20 | offen |
| `N5` | Der dritte Stern „höchstens 3 Felder verloren“ passt nicht zu so viel Hin und Her | Vermutet, nicht gemessen | offen |

### 5.9 · Drei Gesamtrichtungen

| Kürzel | Richtung | Kern | Aufwand | Risiko |
|---|---|---|---|---|
| `R1` | „Schwung“ | Nur die Reparaturen: P0 | Tage | gering; macht allein nicht mehr Lust |
| `R2` | „Feldherren und Wildnis“ | P0 bis P5: Kriegsdruck, wenige besondere Einheiten, Ungeheuer und Bosse in den Missionen | Wochen | mittel |
| `R3` | „Feldzug“ | Kurze Karten, vor allem gegen Wildnis und Bosse; ein Durchlauf aus 5 bis 7 Karten, nach jeder Karte 1 aus 3 Belohnungen | Monate | hoch; größter Wiederspielwert |

Empfehlung aus dem Audit: `R2` Schritt für Schritt über die Proben. `R3` erst, wenn eine Partie in 20 bis 28 Zügen
sauber endet und die Wildnis Spaß macht.

## 6 · Offene Fragen an dich

1. **Bauchprobe Einheiten:** Welche Kürzel aus `U1` bis `U12` willst du spielen, welche lassen dich kalt? Fehlt
   eine Art von Einheit, die dir vorschwebt?
2. **Bauchprobe Gegner:** Welches Ungeheuer oder welcher Boss zuerst nach dem Troll?
3. **Reihenfolge:** Passt P0 bis P6, oder soll die Wildnis (P1) vor dem Fundament kommen?
4. **Echtzeit:** Wird nur noch der Rundenmodus weitergebaut? (Im Rundenplan noch offen.)
5. **Länge einer Partie:** Sind 20 bis 28 Züge das richtige Ziel? (Im Rundenplan noch offen.)

## 7 · Nachmessen

Die Skripte des Audits liegen in `tools/audit/`. Sie lesen das Spiel nur und ändern nichts; die Regelproben
laufen als Abwandlung im Rechner.

```
node tools/audit/metrics.mjs m2 20            Kennzahlen: voller Felder, verfallener Zuwachs, Truppen im Angriff, Hin und Her
node tools/audit/metrics.mjs duel 20 --person dieselben Kennzahlen mit dem klugen Testspieler
node tools/audit/exp.mjs m2 20                Ausgangswerte im selben Format wie die Regelproben
node tools/audit/exp.mjs m2 20 --scale=12 --scalemax=6   Befehle wachsen mit dem Reich
node tools/audit/exp.mjs duel 20 --dig=0.6    Deckung für frische Eroberungen
node tools/audit/exp.mjs four 20 --momentum=2 Gratisbefehl nach Eroberung von 2 Seiten
node tools/audit/exp.mjs m2 20 --reserve=0.5 --rescap=30  verfallener Zuwachs als Truppen
node tools/audit/dom.mjs duel 20              ab wann eine Partie in Wahrheit entschieden ist
```

Feste Befehlszahl, Feldgrenze und Kantenbreite gehen mit dem vorhandenen Werkzeug:
`node tools/simulate-turns.mjs 20 --only=m2 --turns='{"commands":5}'` und `--rules='{"frontage":12}'`.
