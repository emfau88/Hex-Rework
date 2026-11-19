# Rundenmodus · Plan und Regelentwurf

Entwurf 0.3 vom 19.11.2026 · Zweig `runden` · Das öffentliche Spiel bleibt in Echtzeit, bis du entscheidest.
Alle offenen Fragen aus Entwurf 0.1 sind entschieden (Abschnitt 4). Schritt 2 ist gebaut und gemessen: Der
Rundenkern läuft ohne Grafik, die Messwerte stehen in Abschnitt 10. Zwei Regeln haben sich dabei geändert
(Nachschub am Zugende, ein Befehl im ersten Zug).

## 1 · Worum es geht

Das Spiel soll ruhiger werden. Gewinnen soll, wer klüger plant, nicht wer schneller tippt. Dabei soll Zeit für
Gebäude und für die geplanten Sondereinheiten (Troll, Ritter, Drache …) bleiben.

Die Idee: **Man spielt Zug um Zug.** Du hast in jedem Zug wenige Befehle. Danach ziehen die Gegner, und ihre Züge
laufen als kurzer Zeitraffer über die Insel.

### Warum (gemessen am Stand 0.8.2)

Gemessen mit Testspielern auf „Normal“, fünf Karten, je 12 bis 20 Partien:

- **Das Tempo entscheidet.** Mit einem Befehl alle 5 Sekunden gewinnt der Testspieler 17 bis 19 von 20 Partien,
  mit einem alle 8 Sekunden nur 1 bis 5.
- **Viele Befehle sind Fleißarbeit.** 18 bis 41 % gehen bei den langsamen Testspielern an freies Land; beim
  schnellen sind es bis zu 80 %.
- **Zuwachs verfällt.** Ein Feld wächst nur bis 20. Langsame Spieler verschenken so 42 bis 63 % ihres Zuwachses.
  Etwa die Hälfte der eigenen Felder ist meistens gelb (voll). Das erzeugt Druck: „Tu was!“
- **Bauen lohnt sich für Langsame kaum.** Bei ihnen verfallen 17 bis 68 % dessen, was ein Hof zusätzlich bringt.
- **Der Nachschub selbst arbeitet gut.** Er schickt an die richtigen Fronten, nimmt kurze Wege und erzeugt kaum
  Gegenverkehr. Daran liegt es nicht.

Diese Werte stammen aus Skripten der Untersuchung vom 19.11.2026, die nicht im Projekt liegen. Für den Rundenmodus
misst `tools/simulate-turns.mjs` (Abschnitt 10).

## 2 · Leitlinien

1. **Planen statt Tippen.** Alle haben gleich viele Befehle pro Zug, auch die Gegner.
2. **Wenige, wichtige Entscheidungen.** Drei Befehle pro Zug: Was ist jetzt am wichtigsten?
3. **Was keine Entscheidung ist, läuft von selbst:** Wachsen und Nachschub.
4. **Kein Würfelglück.** Vor jedem Befehl zeigt die Vorschau das genaue Ergebnis.
5. **Der Kern bleibt:** Kampf an den Kanten, Umzingeln, Abschneiden.
6. **Die Insel bleibt lebendig:** Märsche und Kämpfe sieht man weiter, als kurze Wiedergabe.

## 3 · Regeln (Stand Schritt 2)

Gegenüber Entwurf 0.1 geändert, beide Male wegen der Messung in Abschnitt 10:
- Der Nachschub läuft **am Ende des eigenen Zugs**, nicht am Anfang.
- Wer beginnt, hat im **allerersten Zug nur 1 Befehl**.

### Ablauf

- Die Reiche ziehen **nacheinander**. Du beginnst, danach ziehen die Gegner in fester Reihenfolge.
- Die Gegnerzüge rechnet der Computer sofort aus. Danach laufen sie als Zeitraffer, insgesamt wenige
  Sekunden. Ein Tipp überspringt die Wiedergabe.
- **Dein Zug:**
  1. **Zugbeginn:** Deine versorgten Felder wachsen. Abgeschnittene Felder verlieren Truppen.
  2. **Befehle:** bis zu 3. Im allerersten Zug der Partie hat, wer beginnt, nur 1.
  3. **Zug beenden** (Knopf). Nicht genutzte Befehle verfallen. Danach verteilt der Nachschub deine Überschüsse an
     die Front, auch auf Felder, die du gerade erobert hast.

### Befehle (3 pro Zug)

| Befehl | So geht es | Kostet |
|---|---|---|
| **Angriff** | Ziel antippen: Alle eigenen Felder daneben greifen zusammen an (wie heute „Sturm“). Mit 50 % oder 100 % ihrer Truppen. Wahlweise rücken die Felder direkt dahinter mit nach und kämpfen an denselben Kanten (die Burg bleibt daheim). Die Vorschau zeigt das Ergebnis, der zweite Tipp bestätigt. Gilt auch für freies Land. | 1 Befehl |
| **Verschieben** | Von einem eigenen Feld zu einem anderen, beliebig weit durch eigenes zusammenhängendes Land, sofort | 1 Befehl |
| **Bauen** | Turm oder Hof auf einem eigenen Feld, sofort, bezahlt mit Truppen dieses Felds. Der Preis steigt wie heute mit jedem weiteren Gebäude. Kein Ansparen mehr: Reicht es noch nicht, wartet man einfach einen Zug. | 1 Befehl |
| **Rückgängig** | nimmt den letzten Befehl dieses Zugs zurück | nichts |

Der Nachschub ist kein Befehl, er läuft von selbst. Er lässt sich abschalten, wie heute.

### Kampf

- Ein Angriff wird **sofort zu Ende gerechnet**, nach den heutigen Kantenregeln:
  - Pro Kante kämpfen höchstens 8 Angreifer gleichzeitig.
  - Alle Verteidiger wehren sich.
  - Deckung (Wald, Hügel, Turm, Burg) mindert ihren Verlust.
  - Wer von mehreren Seiten kommt, verliert viel weniger. Umzingeln lohnt sich also wie heute.
- **Gewinnt der Angreifer,** ziehen die Überlebenden ins Feld, höchstens 30. Der Rest geht auf die Felder zurück,
  von denen aus angegriffen wurde (soweit dort Platz ist). **Verliert er,** sind die Angreifer weg, und der
  Verteidiger behält, was übrig ist.
- **Nachrücken** ist nötig, wo eine Front ein Feld nur von einer Seite berührt: Von einer Seite braucht man gegen
  ein volles Feld (20) insgesamt 30 Truppen, ein Feld hat aber höchstens 20. Eine Burg (40) braucht von drei Seiten
  zusammen 75, von vier 64 (gerechnet).
- **Warum sofort?** Heute dauern fast alle Kämpfe nur Sekunden, also weniger als ein Zug. Belagerungen über
  mehrere Züge bringen viel Aufwand für wenig Gewinn. Sie sind eine Option für später, etwa nur für Burgen.

### Wachsen, Nachschub, Abschneiden

- Ein Zug entspricht zum Start etwa 8 Sekunden der heutigen Spielzeit. Daraus ergeben sich die Startwerte in der
  Tabelle unten.
- Grenzen wie heute: Ein Feld nährt 20 Truppen, die Zitadelle 30, die Burg 40. Was durch Verschieben darüber
  liegt (bis +10), schmilzt bis zum nächsten eigenen Zug weg.
- **Nachschub am Zugende,** nach den heutigen Regeln:
  - Felder im Hinterland geben ihren Überschuss an Frontfelder mit Platz, Fronten zum Gegner zuerst.
  - Die Burg behält 32 Truppen, die sechs Felder um sie je 10.
  - Die Truppen kommen sofort an; man sieht sie kurz marschieren.
  - Er verschickt schon ab 2 Truppen (heute ab 4), weil er nur einmal pro Zug läuft.
  - **Warum am Ende?** Lief er am Anfang, bekam ein gerade erobertes Feld nichts mehr, bevor der Gegner zog. Dann
    wechselten jeden Zug dieselben drei Felder den Besitzer, und nur 5 von 30 Partien endeten vor Zug 80.
- **Abgeschnitten** (keine Verbindung zur eigenen Burg): Das Feld wächst nicht und verliert 4 Truppen pro Zug,
  bleibt aber bei mindestens 1.

### Bauen

- Turm: wie heute +60 % Deckung. Hof: wie heute mehr Zuwachs.
- Später denkbar: weitere Gebäude mit echter Wahl, etwa eine Kaserne für den Ritter. Nicht im Probebau.

### Ende einer Partie

- Wie heute: alle Burgen erobern, oder die Zitadelle eine Zahl von Zügen halten (Mission 3).
- **Zuggrenze** je Mission. Die Sterne gibt es später für wenige Züge statt für kurze Zeit.
- Gegen endlose Partien wie heute ein **Sturm**, hier ab einem festen Zug: Die Kanten werden breiter, die Deckung
  schwächer.

### Gegner

- Sie haben dieselben 3 Befehle pro Zug und dieselben Regeln, ohne versteckte Truppen.
- Ihre Planung stammt zum großen Teil von den heutigen Gegnern: Vorschau, Angriff von mehreren Seiten,
  Abschneiden.
- **Stufen entstehen aus der Klugheit, nicht aus dem Tempo:**
  - Leicht: greift von wenigen Seiten an, will viel Vorsprung, baut selten.
  - Schwer: umzingelt, schneidet ab, baut gezielt.
  - Dazu wie heute weniger Zuwachs auf den leichten Stufen.

### Werte (alle in `TURN_RULES` in `src/sim/rules.js`)

| | heute (pro Sekunde) | Rundenmodus (pro Zug) |
|---|---|---|
| Zuwachs Wiese, Wald | 0,24 | 2 |
| Zuwachs Hügel | 0,2 | 1,5 |
| Zuwachs Zitadelle | 0,6 | 5 |
| Zuwachs Burg | 0,8 | 6 |
| Hof zusätzlich | 0,3 | 2,5 |
| Abgeschnitten | −0,5 | −4 |
| Befehle | so viele man schafft | 3, im allerersten Zug für den Beginner 1 |
| Nachschub | jede Sekunde, ab 4 Truppen | am Zugende, ab 2 Truppen |
| Sturm | ab 420 s, voll nach 120 s | ab Zug 40, voll nach 15 Zügen |
| Zuggrenze | keine | 80 Züge, dann gewinnt niemand |
| Frontbreite, Schaden, Deckung, Grenzen, Baupreise | wie heute | wie heute |

Ein Zug zählt für die Uhr des Spiels 8 Sekunden. Davon hängen nur die Planung der Gegner (etwa „keine Burg
angreifen vor …“) und die Zeitstempel ab.

### Sondereinheiten (Skizze, nicht im Probebau)

Runden machen sie einfacher zu verstehen und abzustimmen:

- **Troll:** überfällt alle 5 Züge das schwächste Nachbarfeld und kündigt es einen Zug vorher an. Der Ring zählt
  die Züge herunter.
- **Ritter:**
  - Entsteht aus 15 Truppen eines Felds und kostet 1 Befehl. Jedes Reich hat höchstens einen.
  - Er zieht mit einem Angriff mit und stärkt dessen Kante, etwa mit mehr Frontbreite.
  - Fällt sein Feld, wird er gefangen.
- **Drache:** verbrennt alle 6 Züge das stärkste Feld, mit einem Zug Vorwarnung. Das hilft gegen Stapeln.

## 4 · Entschieden (19.11.2026)

Du hast alle Empfehlungen so angenommen:

1. **Nacheinander ziehen**, nicht gleichzeitig.
2. **3 Befehle pro Zug.** Zum Vergleich werden auch 2 und 4 gemessen.
3. **Kampf sofort zu Ende rechnen.** Belagerungen über mehrere Züge erst später, falls sie fehlen.
4. **Verschieben beliebig weit und sofort** durch eigenes Land.
5. **Bauen nur, wenn die Truppen schon da sind**, kein Ansparen.
6. **Rückgängig für den letzten Befehl** im eigenen Zug.
7. **Du beginnst.** Gemessen wird, wie groß der Vorteil des ersten Zugs ist.
8. **Echtzeit bleibt** bis zur Entscheidung (Schritt 6) unverändert.

## 5 · Vorgehen in Schritten

Zu jedem Schritt steht, wann er fertig ist. Den Aufwand habe ich geschätzt, nicht gemessen.

| Schritt | Was | Fertig, wenn | Aufwand |
|---|---|---|---|
| 0 | Zweig `runden` und dieser Plan | Plan liegt vor | erledigt |
| 1 | Regeln festlegen | du hast die offenen Fragen beantwortet, Entwurf 0.2 steht | erledigt |
| 2 | Rundenkern ohne Grafik: Regeln, Gegner mit 3 Befehlen, Tests, Messwerkzeug „Computer gegen Computer“ | Partien auf dem Duell dauern 20 bis 35 Züge; wer beginnt, gewinnt höchstens 55 %; Leicht, Normal und Schwer sind klar verschieden | gebaut, Abnahme nur zum Teil erreicht (Abschnitt 10) |
| 3 | Spielbar im Browser auf der Duell-Karte: Zugleiste, Befehle mit Vorschau, Rückgängig, Gegnerzüge im Zeitraffer, Liste der Ereignisse; PC und Handy | eine Partie läuft im Browser ohne Fehler durch, an beiden Bildschirmen geprüft | 2 bis 3 Sitzungen |
| 4 | Testversion online, Link in der README | der Link öffnet die Testversion; das echte Spiel und dein Spielstand sind unverändert | 1 Sitzung |
| 5 | Dein Spieltest | du hast die Fragen unten beantwortet | deine Zeit |
| 6 | **Entscheidung:** (a) Runden wird das Spiel, (b) beide Modi bleiben, (c) verwerfen | | |
| 7 | nur bei (a) oder (b): Missionen 1 bis 3 in Zügen, Troll in Zügen, Ritter, Feinschliff, dann Übernahme ins öffentliche Spiel | | Wochen |

Bis Schritt 6 ruht die Arbeit an neuen Figuren. Wie Ritter und Co. funktionieren, hängt davon ab, ob in Sekunden
oder in Zügen gespielt wird.

**Fragen für deinen Spieltest (Schritt 5):**
- Fühlt es sich ruhiger an, und kommst du zum Bauen?
- Sind 3 Befehle zu wenig, genau richtig oder zu viel?
- Ist der Zeitraffer der Gegner zu schnell, zu langsam oder unnötig?
- Fehlt dir die Spannung der Echtzeit?
- Wie lang soll eine Partie sein?

## 6 · Testversion zum Spielen

- **Adresse:** https://emfau88.github.io/Hex-Rework/runden/ (das echte Spiel bleibt unter
  https://emfau88.github.io/Hex-Rework/).
- **So entsteht sie:**
  - Heute veröffentlicht GitHub nur, was auf `main` landet (geprüft: der Ablauf in `.github/workflows/pages.yml`
    startet nur dort und auf Knopfdruck). Ein Zweig allein erscheint also nirgends.
  - Der Ablauf auf `main` wird erweitert. Er holt sich zusätzlich den Zweig `runden`, prüft dessen Tests und legt
    ihn in den Unterordner `runden/`. Scheitern die Tests des Zweigs, fehlt nur die Testversion; das echte Spiel
    wird trotzdem veröffentlicht.
  - Auf dem Zweig startet ein kleiner Ablauf bei jedem Hochladen die Veröffentlichung von `main` neu. So ist die
    Testversion nach jedem Schritt aktuell.
  - Dabei wird das echte Spiel jedes Mal unverändert mit veröffentlicht. Spieler merken davon nichts.
- **Eigener Speicher:** Beide Versionen liegen unter derselben Adresse und teilen sich deshalb den Speicher im
  Browser. Die Testversion bekommt einen eigenen Schlüssel (`hexwars_runden_v1` statt `hexwars_diorama_v2`, siehe
  `src/ui/store.js`). Dein Spielstand im echten Spiel bleibt so unberührt.
- **Erkennbar:** Im Menü steht oben „Testversion · Runden“, dazu ein Link zurück zum echten Spiel.
- **Abschnitt für die README auf `main`** (Vorschlag):

  > ### Testversion: Rundenmodus
  > [▶ Rundenmodus ausprobieren](https://emfau88.github.io/Hex-Rework/runden/) · Probe, in der man Zug um Zug
  > spielt statt in Echtzeit. Unfertig; der Spielstand wird getrennt gespeichert. Plan:
  > [docs/RUNDEN-PLAN.md im Zweig runden](https://github.com/emfau88/Hex-Rework/blob/runden/docs/RUNDEN-PLAN.md)

- **Braucht dein Okay:**
  - Die Erweiterung des Ablaufs und der README-Abschnitt landen auf `main`. Das ist ein Push, der das echte Spiel
    unverändert neu veröffentlicht.
  - Das Hochladen des Zweigs `runden` auf GitHub. Das veröffentlicht nichts, macht den Zweig aber öffentlich
    sichtbar.
- **Vorher schon spielbar:** auf deinem Rechner aus dem Ordner „HexWars Diorama runden“ mit `node serve.mjs 4181`,
  am Handy im selben WLAN mit `node serve.mjs 4181 --lan`.

## 7 · Technik in Kürze

- **Zwei Ordner:** „HexWars Diorama“ bleibt auf `main`, „HexWars Diorama runden“ ist der Zweig (`git worktree`).
  Beide laufen nebeneinander (Port 4180 und 4181), und am echten Spiel kann weiter gearbeitet werden.
- **Eigene Regeldatei für Züge** (etwa `src/sim/turns.js`):
  - Karten, Missionen, Felder und die Kantenrechnung werden mitbenutzt.
  - Die Echtzeit-Regeln bleiben unverändert, und ihre Tests laufen weiter.
- **Gegner:** Die heutige Planung bekommt ein Budget von 3 Befehlen pro Zug.
- **Bild:** Insel, Figuren, Zahlen und Zeichen bleiben. Neu sind die Zugleiste oben, die Vorschau mit Ergebnis und
  die Wiedergabe der Gegnerzüge mit den vorhandenen Marschbildern.
- **Prüfen:**
  - neue Tests für die Zugregeln, etwa „gleicher Start, gleiche Befehle, gleiches Ergebnis“ und „die Vorschau
    stimmt mit dem Ergebnis überein“;
  - ein Messwerkzeug wie `tools/simulate.mjs` für Züge;
  - Durchläufe im Browser am PC und im Handy-Format.

## 8 · Risiken und wie wir sie prüfen

| Risiko | Prüfung |
|---|---|
| Es wird langweilig oder zäh | Länge in Zügen messen; dein Spieltest |
| Wer beginnt, ist im Vorteil | Computer gegen Computer in beiden Reihenfolgen messen |
| Wer vorn liegt, zieht davon | messen, wie oft der Zurückliegende noch gewinnt; Grenzen, Abschneiden und steigende Baupreise bremsen schon heute |
| Zwei Spielarten verdoppeln die Arbeit | Entscheidung in Schritt 6 |
| Gemessene Echtzeit-Balance gilt nicht mehr | Neu messen gehört zu Schritt 2 |

## 9 · Bewusst nicht im Probebau

Missionen 1 bis 3, geführte Schritte, Troll und weitere Figuren, Sterne, neue Gebäude, Belagerungen über mehrere
Züge, Mehrspieler.

## 10 · Messung Schritt 2 (19.11.2026)

**So gemessen:** `node tools/simulate-turns.mjs 60`, Karte Duell, 60 Zufallskarten je Stufe.
- Computer gegen Computer: jede Karte zweimal, damit jedes Reich einmal beginnt (120 Partien).
- Testspieler gegen Computer: Der Testspieler beginnt, wie du. „Anfänger“ greift von höchstens zwei Seiten an
  und will viel Vorsprung. „Kluger“ umzingelt, rückt nach und baut.
- Zur Gegenprobe ein zweiter Satz Karten (`--shift=1`). Die Werte stehen als „erste · zweite Messung“.

### Mit den Regeln aus Abschnitt 3

**Computer gegen Computer**

| Stufe | entschieden | Ende in Zug (10 % / Mitte / 90 %) | davon im Sturm | wer beginnt, gewinnt |
|---|---|---|---|---|
| Leicht | 100 · 107 von 120 | 29/41/53 · 26/42/61 | 53 · 63 | 69 % · 66 % |
| Normal | 104 · 98 von 120 | 24/36/53 · 24/35/55 | 40 · 41 | 57 % · 63 % |
| Schwer | 93 · 84 von 120 | 30/42/70 · 29/41/61 | 54 · 44 | 59 % · 48 % |

**Testspieler gegen Computer** (Siege von 60, in Klammern der mittlere Zug des Siegs)

| Stufe | Anfänger | Kluger |
|---|---|---|
| Leicht | 56 · 55 (26 · 24) | 59 · 59 (24 · 21) |
| Normal | 42 · 41 (37 · 44) | 38 · 48 (25 · 23) |
| Schwer | 6 · 11 (60 · 47) | 22 · 24 (47 · 42) |

**Wofür die Computer ihre Befehle nutzen** (je Zug): Angriff 1,7 bis 2,7, Bauen 0,1 bis 0,2, Verschieben nie.

### Der Weg dorthin (Normal, erste Messung)

| Regel | entschieden | Ende Mitte | wer beginnt, gewinnt |
|---|---|---|---|
| Entwurf 0.1: Nachschub am Zuganfang (nur 15 Karten, 30 Partien) | 5 von 30 | Zug 60 | 60 % |
| Nachschub am Zugende | 106 von 120 | Zug 35 | 68 % |
| dazu 2 Befehle im ersten Zug | 100 von 120 | Zug 39 | 71 % |
| dazu 1 Befehl im ersten Zug (gewählt) | 104 von 120 | Zug 36 | 57 % |
| ohne Ausgleich, Sturm schon ab Zug 28 | 106 von 120 | Zug 33 | 69 % |
| ohne Ausgleich, Normal rückt nach wie Schwer | 76 von 120 | Zug 43 | 58 % |

### 2, 3 oder 4 Befehle (Normal, mit 1 Befehl im ersten Zug)

| Befehle | entschieden | Ende Mitte | wer beginnt, gewinnt | Anfänger / Kluger siegen |
|---|---|---|---|---|
| 2 | 57 von 120 | Zug 53 | 49 % | 15 / 32 von 60 |
| 3 | 104 von 120 | Zug 36 | 57 % | 42 / 38 von 60 |
| 4 | 110 von 120 | Zug 24 | 77 % | 55 / 59 von 60 |

### Abnahme von Schritt 2

- **Stufen klar verschieden: erreicht.** Der Anfänger gewinnt gegen Leicht fast immer, gegen Normal etwa 2 von 3,
  gegen Schwer selten.
- **Dauer 20 bis 35 Züge: zum Teil.**
  - Gegen Leicht und Normal liegen die Siege der Testspieler meist bei Zug 21 bis 44.
  - Gleich starke Computer brauchen in der Mitte 35 bis 42 Züge, viele Partien entscheidet erst der Sturm.
- **Wer beginnt, höchstens 55 %: nicht erreicht.** Mit 1 Befehl im ersten Zug sind es bei Normal 57 bis 63 %.
  Weil du immer beginnst, hilft dir dieser Vorteil. Die Stufen sind mit ihm gemessen.

### Was dabei aufgefallen ist (gemessen oder gerechnet)

- **Gleich Starke verkeilen sich.** Haben beide gleich viele Befehle und planen gleich, pendelt die Front. Ungleiche
  Partien sind kurz.
- **Eingeschlossene Burgen.** In einer langen Partie hatte ein Reich ab Zug 20 alle 44 Felder voll (900 Truppen).
  Es kam trotzdem 30 Züge lang nicht an die Burg heran: Jedes Randfeld berührte die Front nur von einer Seite.
  Deshalb gibt es beim Angriff das Nachrücken.
- **Die Computer verschieben nie,** sie greifen nur an und bauen.
- **Gebaut wird selten.** Der Nachschub leert das Hinterland jeden Zug. Ein Hof (Preis 8, also 9 Truppen auf dem
  Feld) passt deshalb fast nur auf die Felder um die Burg, die 10 behalten. Ob „kein Ansparen“ richtig ist, zeigt
  dein Spieltest.

### Vermutet, nicht gemessen

- Ein Mensch spielt anders als die Testspieler. Wie lang deine Partien werden, zeigt erst Schritt 5.
- Ein Ausgleich für den Zweiten (etwa ein paar Truppen mehr zum Start) könnte den Vorteil des Beginners weiter
  drücken. Das lohnt sich erst, wenn Gegner gegen Gegner wichtig wird, etwa mit drei Reichen.
