# Rundenmodus · Plan und Regelentwurf

Entwurf 0.9 vom 22.11.2026 · Zweig `runden` · Das öffentliche Spiel bleibt in Echtzeit, bis du entscheidest.
Die Probe (Schritte 0 bis 4) ist gebaut und online: https://emfau88.github.io/Hex-Rework/runden/ (Abschnitt 6).
Du hast sie am 20.11.2026 gespielt und entschieden: **Der Rundenmodus wird in diesem Zweig ausgebaut**
(Abschnitt 12). Offen ist noch, ob er die Echtzeit ersetzt oder neben ihr bleibt. Der Ausbau ist in Blöcke
geteilt (Abschnitt 13). **Block 1 ist gebaut und gemessen** (Abschnitt 14): Die Gegner warten nicht mehr ab.
Ein Kriterium ist knapp verfehlt: Gleich starke Gegner auf „Schwer“ verkeilen sich noch zu oft. Dazu brauche ich
deine Entscheidung (Abschnitt 14, „Was offen bleibt“). **Block 2 ist gebaut, aber noch nicht abgenommen**
(Abschnitt 15). Nach deiner Rückmeldung vom 22.11.2026 ist er überarbeitet: Auch deine eigenen Truppen
marschieren jetzt sichtbar, die Pfeile sind einer hellen Spur mit Ring gewichen, und der Zuwachs steht am Feld.
Das Tempo des Zeitraffers passt für dich. Dazu erklärt das Spiel jetzt Turm, Hof, Zuwachs und Deckung
(Abschnitt 16). Offen sind dein Urteil zur neuen Darstellung und der Test am Handy.

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
  - Schwer: umzingelt, schneidet ab, stößt mit frisch eroberten Feldern sofort weiter vor.
  - Dazu wie heute weniger Zuwachs auf den leichten Stufen.
- **Sie spielen zu Ende** (seit Block 1, Abschnitt 14):
  - **Durchbruch:** Findet ein Reich eine Weile keinen Angriff (Leicht 2 Züge, Normal und Schwer 1 Zug), greift
    es ein Feld mit allem an und lässt die Felder dahinter nachrücken. Das ist derselbe Befehl, den du hast.
  - **Verlegen:** Reicht auch das nicht, holt es Truppen aus dem Hinterland hinter die Front und versucht es im
    nächsten Zug wieder.
  - Eine Burg bleibt in den ersten Zügen verschont (Leicht bis Zug 25, Normal bis 12, Schwer bis 6), außer es
    ist sonst nichts mehr anzugreifen.

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
| 3 | Spielbar im Browser auf der Duell-Karte: Zugleiste, Befehle mit Vorschau, Rückgängig, Gegnerzüge im Zeitraffer, Liste der Ereignisse; PC und Handy | eine Partie läuft im Browser ohne Fehler durch, an beiden Bildschirmen geprüft | erledigt (Abschnitt 11) |
| 4 | Testversion online, Link in der README | der Link öffnet die Testversion; das echte Spiel und dein Spielstand sind unverändert | erledigt (Abschnitt 6) |
| 5 | Dein Spieltest | du hast die Fragen unten beantwortet | gespielt am 20.11.2026; eine Frage beantwortet, fünf offen (Abschnitt 12) |
| 6 | **Entscheidung:** (a) Runden wird das Spiel, (b) beide Modi bleiben, (c) verwerfen | | zum Teil entschieden: nicht (c), es wird ausgebaut. (a) oder (b) ist offen (Abschnitt 12) |
| 7 | Ausbau: Gegner, Zeitraffer, Missionen 1 bis 3, freies Spiel, Troll, Ritter, dann Übernahme ins öffentliche Spiel | | in Blöcke geteilt (Abschnitt 13) |

Bis zur Wahl zwischen (a) und (b) ruht die Arbeit an neuen Figuren. Wie Ritter und Co. gebaut werden, hängt
davon ab, ob sie nur in Zügen oder auch in Sekunden funktionieren müssen.

**Fragen für deinen Spieltest (Schritt 5):** Was davon beantwortet ist, steht in Abschnitt 12.
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

- **Stand (19.11.2026, Schritt 4 erledigt):**
  - Dein Okay kam am 19.11. Ablauf und README-Abschnitt sind auf `main`, der Zweig `runden` ist auf GitHub. Der
    kleine Ablauf auf dem Zweig heißt `.github/workflows/runden.yml`.
  - Geprüft nach dem Hochladen:
    - Der Neuaufbau lief durch, die Tests des Zweigs eingeschlossen.
    - Die Testversion öffnet sich unter `/runden/`, das Duell läuft dort bis zum zweiten Zug ohne Fehlermeldung.
    - Das echte Spiel online ist Datei für Datei gleich wie `main` und hat keinen Rundenmodus.
    - Dein Spielstand im echten Spiel blieb unverändert. Die Testversion schrieb nur unter ihrem eigenen
      Schlüssel.
  - Jedes weitere Hochladen von `runden` veröffentlicht die Seite neu; das echte Spiel geht dabei unverändert mit.
- **Auch lokal spielbar:** aus dem Ordner „HexWars Diorama runden“ mit `node serve.mjs 4181`, am Handy im selben
  WLAN mit `node serve.mjs 4181 --lan`.

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
- **Die Computer verschieben nie,** sie greifen nur an und bauen. (Seit Block 1 verlegen sie Truppen, wenn sie
  festsitzen; Abschnitt 14.)
- **Gebaut wird selten.** Der Nachschub leert das Hinterland jeden Zug. Ein Hof (Preis 8, also 9 Truppen auf dem
  Feld) passt deshalb fast nur auf die Felder um die Burg, die 10 behalten. Ob „kein Ansparen“ richtig ist, zeigt
  dein Spieltest.

### Vermutet, nicht gemessen

- Ein Mensch spielt anders als die Testspieler. Wie lang deine Partien werden, zeigt erst Schritt 5.
- Ein Ausgleich für den Zweiten (etwa ein paar Truppen mehr zum Start) könnte den Vorteil des Beginners weiter
  drücken. Das lohnt sich erst, wenn Gegner gegen Gegner wichtig wird, etwa mit drei Reichen.

## 11 · Schritt 3 im Browser (19.11.2026)

### Was es gibt

- **Menü:** neuer Abschnitt „Rundenmodus · Test“ mit „Duell in Runden“ (Zufallskarte, 2 Reiche). Oben im Menü
  steht „Testversion · Rundenmodus“ mit einem Link zum echten Spiel.
- **Zugleiste über den Knöpfen:**
  - In deinem Zug: „Dein Zug · Noch 3 Befehle“, ein Punkt pro Befehl, der Pfeil zum Zurücknehmen und „Zug
    beenden“. Der Knopf leuchtet, wenn keine Befehle mehr übrig sind.
  - Während die Gegner ziehen: „Ember zieht · Befehl 1 von 3“ und „Überspringen“.
- **Befehle wie im Echtzeitspiel:**
  - Der erste Tipp auf ein fremdes Feld zeigt Pfeile von allen Feldern, die mitmachen, und das genaue Ergebnis:
    ✓ und wie viele einziehen, oder ✗ und wie viele Verteidiger bleiben. Der zweite Tipp greift an. Dafür hast
    du 10 Sekunden (im Echtzeitspiel 2,5).
  - Ziehen von einem eigenen Feld: auf ein fremdes greift nur dieses Feld an, auf ein eigenes verschiebt es.
  - Bauen mit den Knöpfen oder mit T und H.
  - Ohne Befehle bleibt der Pfeil grau, und am Feld steht „Keine Befehle mehr“.
- **Tasten am PC:** Z oder Strg+Z nimmt zurück, Enter beendet den Zug (oder überspringt die Gegner).
- **Gegnerzüge im Zeitraffer:**
  - Zuerst marschiert dein Nachschub. Dann spielt jeder Gegner seine Befehle einzeln: Seine Truppen laufen zur
    Kante, erst dort wird gekämpft.
  - Danach kommt „Zug 4 · du bist dran“ und eine Zeile pro Gegner, etwa „Ember: 2 Felder genommen (1 von dir)“.
  - Die Zeilen stehen auch rechts in der Ereignisliste, mit Zugnummer (Z3).
- **Pause-Knopf:** öffnet die Hilfe mit den Regeln für Runden. Eine Pause gibt es nicht, weil nichts von allein
  läuft.
- **Ergebnis:** Sterne für den Sieg, für „in höchstens 30 Zügen“ und für „höchstens 3 Felder verloren“. Gezählt
  werden Züge statt Zeit. Die 30 Züge sind geschätzt, nicht gemessen.
- **Eigener Speicher** `hexwars_runden_v1`. Geprüft: Die Testversion schreibt nur unter ihrem eigenen Schlüssel.

### Wie geprüft

- **Bildschirme:** im eingebauten Browser am PC (1280 × 800) und im Handyformat (375 × 812).
- **Abläufe:** Menü, Start, Vorschau, Angriff, Verschieben, Bauen, „keine Befehle mehr“, Rückgängig per Knopf und
  Taste, Zug beenden per Knopf und Enter, Gegnerzug, Überspringen, Hilfe, Ergebnis.
- **Drei ganze Partien bis zum Ende, ohne Fehlermeldung:**
  - zwei Siege, in Zug 13 und 15. Ein kleines Skript gab die Befehle über dieselben Wege wie dein Tippen;
  - eine Niederlage. Ich habe nur „Zug beenden“ gedrückt, die Burg fiel in Zug 53.
- **Neue Tests** (`tests/turnplay.test.mjs`): Gegnerzüge im Zeitraffer und übersprungene Gegnerzüge enden auf genau
  demselben Brett wie die direkte Rechnung. Alle 98 Tests sind grün.

### Beim Prüfen geändert

- **Zweiter Tipp:** 10 statt 2,5 Sekunden im Rundenmodus. Mit 2,5 Sekunden verfiel der erste Tipp, während man die
  Vorschau las.
- **Nach dem Bauen ist kein Feld mehr ausgewählt.** Vorher wurde der nächste Tipp auf ein fremdes Feld zu einem
  Angriff nur von dem gerade bebauten Feld. Im Test waren das 2 Mann, verloren, und ein Befehl war weg.
- **„Zug beenden“ wartet eine Sekunde, wenn du wieder dran bist.** Kurz davor heißt derselbe Knopf noch
  „Überspringen“. Ein Tipp, der dafür gedacht war und zu spät kam, beendete sonst deinen eigenen Zug. Genau das ist
  im Test passiert.
- **Kürzere Texte in der Zugleiste,** damit sie aufs Handy passen.

### Nicht geprüft

- **Das Tempo des Zeitraffers.** Beim Test war die Browser-Ansicht ausgeblendet, und dann zeichnet der Browser
  keine Bilder. Ich habe die Wiedergabe deshalb in Schritten angetrieben und einzelne Bilder angesehen.
  - Ein Angriff dauert 0,8 Sekunden, bei „Ruhig“ 1,1 und bei „Schnell“ 0,5.
  - Ob sich das gut anfühlt, zeigt dein Spieltest.
- **Ein echtes Handy.** Geprüft ist nur das Handyformat im Browser.

### Aufgefallen

- **Marschierende Gegner sind klein** (gesehen): 8 Mann sind 2 Figuren, wie im Echtzeitspiel. Ob man ihnen gut
  folgen kann, zeigt dein Spieltest.
- **Wer nur abwartet, hält lange durch** (gemessen, eine Partie auf Normal):
  - Ab Zug 17 hatte der Computer 48 Felder, ich nur noch 4.
  - Diese letzten 4 Felder mit der Burg griff er bis Zug 53 nicht an („wartet ab“).
  - Das ist dieselbe Schwäche wie bei den eingeschlossenen Burgen in Abschnitt 10. Für deinen Spieltest ist sie
    unwichtig, für „Schwer“ später schon.
  - Nachtrag 21.11.2026: Das war eine einzelne Partie. Über 60 Karten gemessen ist dieser Fall selten
    (Abschnitt 13, Ausgangswerte).

## 12 · Dein Spieltest und die Entscheidung (20.11.2026)

**Dein Ergebnis, wörtlich:** „ja ist schon deutlich ruhiger und erstmal interessant soweit, denke das sollten wir
in diesem branch ausbauen mit den runden“

### Was damit feststeht

- **Ruhiger: ja.** Das war das Hauptziel der Probe (Abschnitt 1).
- **Verwerfen (c) ist vom Tisch.** Der Rundenmodus wird weiterverfolgt.
- **Ausgebaut wird im Zweig `runden`.** Das öffentliche Spiel bleibt bis auf Weiteres unverändert in Echtzeit.

### Was noch offen ist

| Frage | Wofür ich die Antwort brauche |
|---|---|
| **(a) Runden ersetzt die Echtzeit** oder **(b) beide Spielarten bleiben** | Spätestens vor Block 6 (Troll). Bei (b) muss jede Figur und jede Mission in beiden Spielarten gebaut, gemessen und gepflegt werden. Die Blöcke 1 bis 5 gehen ohne diese Antwort. |
| Kommst du zum Bauen? | Block 2. Die Computer bauen selten (Abschnitt 10). |
| 3 Befehle: zu wenig, richtig oder zu viel? | Block 2. Gemessen sind 2, 3 und 4 (Abschnitt 10). |
| Zeitraffer: zu schnell, zu langsam, unnötig? Kannst du den Gegnern folgen? | **beantwortet am 22.11.2026:** „tempo von gegner passt“. Die Pfeile waren lesbar, sahen aber billig aus (Abschnitt 15). |
| Fehlt dir die Spannung der Echtzeit? | Block 2, und die Wahl zwischen (a) und (b) |
| Wie lang soll eine Partie sein (in Zügen oder Minuten)? | Blöcke 1, 3 und 4: Danach richten sich Zuggrenze, Sturm und die Sterne. |

## 13 · Ausbau in Blöcken (Vorschlag vom 21.11.2026)

Das ist der frühere Schritt 7, zerlegt. Jeder Block hat ein Abnahmekriterium. Fertig ist er, wenn das Kriterium
erfüllt ist, alle Tests grün sind, das Ergebnis im Browser geprüft ist und dieser Plan den neuen Stand zeigt.
Am Ende jedes Blocks frage ich, ob die Testversion neu hochgeladen werden soll.

Den Aufwand habe ich geschätzt, nicht gemessen. Eine „Sitzung“ ist ein Arbeitsgang wie die Schritte 2 oder 3.

| Block | Was | Fertig, wenn | Aufwand |
|---|---|---|---|
| 1 | **Gegner, die zu Ende spielen.** Der Computer soll einen klaren Vorsprung nutzen, statt abzuwarten, und gleich starke Gegner sollen sich seltener verkeilen. Dazu kommt die Messung „Spieler tut nichts“ ins Messwerkzeug. | je 60 Karten, zwei Würfelsätze: (1) Wer nichts tut, verliert auf jeder Stufe 60 von 60. (2) Höchstens 2 von 60 Partien je Stufe, in denen der Computer 5 Züge am Stück nicht angreift. (3) Computer gegen Computer auf Schwer: mindestens 100 von 120 entschieden. (4) Die Stufen bleiben klar verschieden: Anfänger gegen Leicht mindestens 50, gegen Normal 30 bis 48, gegen Schwer höchstens 15 Siege von 60. | 1 Sitzung |
| 2 | **Zeitraffer und Lesbarkeit.** Marschierende Gegner besser sichtbar, Tempo bei normaler Bildfolge geprüft, Prüfung auf einem echten Handy (mit dir). Dazu das, was deine Antworten aus Abschnitt 12 verlangen (etwa Befehlszahl oder Bauen). | Du kannst jedem Gegnerzug folgen, ohne zu suchen (dein Urteil). Das Tempo ist bei sichtbarem Fenster gemessen. Du hast eine Partie auf deinem Handy gespielt, ohne dass etwas klemmt. | 1 Sitzung, dazu dein Test |
| 3 | **Mission 1 in Zügen,** mit der Einführung in geführten Schritten und Sternen für wenige Züge. | Die Mission läuft im Browser von der Einführung bis zum Ergebnis ohne Fehler, an PC und im Handyformat. Je 60 Partien, zwei Würfelsätze: Der Anfänger gewinnt auf Normal 40 bis 52 von 60, auf Leicht mindestens 54. Siege liegen in der Mitte bei 20 bis 30 Zügen (oder bei der Länge, die du nennst). | 1 bis 2 Sitzungen |
| 4 | **Missionen 2 und 3 in Zügen.** Mission 2 mit dem Abschneiden, Mission 3 mit der Zitadelle („halte sie so viele Züge“). | Beide laufen im Browser ohne Fehler durch. Je 60 Partien, zwei Würfelsätze, auf Normal: Der Kluge gewinnt 40 bis 54 von 60, der Anfänger mindestens 20. Höchstens 6 von 60 Partien enden an der Zuggrenze. | 2 bis 3 Sitzungen |
| 5 | **Freies Spiel in Zügen:** Zufallskarte und die Karte mit vier Reichen. Bei drei Gegnern muss der Zeitraffer kurz bleiben. | Beide Karten laufen im Browser ohne Fehler durch. Der Zeitraffer aller Gegner zusammen dauert höchstens so lange, wie du in Block 2 gut fandest. Auf Normal: mindestens 100 von 120 Partien Computer gegen Computer entschieden, Ende in der Mitte vor Zug 45. | 1 bis 2 Sitzungen |
| 6 | **Troll in Zügen.** Er überfällt alle paar Züge und kündigt es einen Zug vorher an (Skizze in Abschnitt 3). Zuerst in der Figurenschau, dann auf einer Karte. | In der Figurenschau sieht man Ankündigung, Überfall und Rückzug Zug um Zug. Tests für den Troll in Zügen sind grün, die Tests für den Troll in Echtzeit auch. | 1 bis 2 Sitzungen |
| 7 | **Ritter,** die erste neue Figur für Züge. Erst abstimmen, was er genau kann, dann bauen, zuerst nur in der Figurenschau. | Du hast seine Regeln bestätigt. Er ist in der Figurenschau einzeln ansehbar. Tests sind grün. Mit Ritter gemessen bleibt das Duell auf Normal im Rahmen von Block 1. | 2 Sitzungen |
| 8 | **Übernahme ins öffentliche Spiel.** Bei (a) ersetzt der Rundenmodus die Echtzeit, bei (b) bekommt das Menü beide. Dazu Spielstand, Texte in Deutsch und Englisch, README. | Du hast den Stand in der Testversion freigegeben. Danach ist das öffentliche Spiel umgestellt, dein alter Fortschritt ist nicht verloren, und alle Tests sind grün. | 1 bis 2 Sitzungen, erst nach deinem Okay |

**Stand:** Block 1 ist gebaut (Abschnitt 14). Drei von vier Kriterien sind erfüllt, das dritte knapp nicht;
du hast am 21.11.2026 entschieden, trotzdem weiterzumachen, es bleibt als offen stehen. Block 2 ist gebaut und
wartet auf deinen Test (Abschnitt 15).

**Online:** Seit dem 22.11.2026 hat die Testversion unter `/runden/` den Stand von Block 1 und Block 2. Geprüft
nach dem Hochladen: Die Veröffentlichung lief durch, das Duell läuft online vier Züge ohne Fehlermeldung, und
das echte Spiel ist unverändert.

**Reihenfolge, und warum Block 1 zuerst:** Alle späteren Messungen an Missionen hängen davon ab, wie der Gegner
spielt. Ändere ich ihn erst danach, muss ich die Missionen neu messen.

### Ausgangswerte für die Blöcke (gemessen am 21.11.2026)

**Spieler, der nie einen Befehl gibt** (Duell, 60 Karten je Stufe, erste · zweite Messung). Das Skript dafür liegt
noch nicht im Projekt; es kommt mit Block 1 ins Messwerkzeug.

| Stufe | Burg gefallen | Ende in Zug (10 % / Mitte / 90 %) | Partien mit 5 Zügen ohne Angriff |
|---|---|---|---|
| Leicht | 59 · 59 von 60 | 26/26/26 · 26/26/26 | 8 · 10 |
| Normal | 59 · 59 von 60 | 19/22/24 · 19/22/24 | 4 · 3 |
| Schwer | 60 · 60 von 60 | 16/18/21 · 15/18/20 | 2 · 1 |

- Der Computer nimmt die Burg eines Wartenden also fast immer zügig. Die Partie aus Abschnitt 11 (Burg hält bis
  Zug 53) ist der seltene Fall: Je Stufe bleibt höchstens 1 von 60 Partien ganz offen.
- „Leicht“ endet immer genau in Zug 26. Das liegt an der Regel „keine Burg angreifen vor Sekunde 200“, also vor
  Zug 25.
- Häufiger ist das Verkeilen, wenn sich beide wehren: Computer gegen Computer bleiben auf Schwer 27 bis 36 von
  120 Partien ohne Sieger (Abschnitt 10).

**Die anderen Karten im Rundenkern, so wie er heute ist** (`node tools/simulate-turns.mjs 20 --only=… --level=normal`,
nur 20 Karten und ein Würfelsatz, also grob):

| Karte | Computer gegen Computer | Anfänger siegt | Kluger siegt | Was das heißt |
|---|---|---|---|---|
| Mission 1 | 40 von 40 entschieden, Mitte Zug 26 | 13 von 20 | 15 von 20 | passt schon fast |
| Mission 2 | 5 von 40 entschieden, Mitte Zug 57 | 9 von 20 | 18 von 20 | verkeilt sich an den Pässen |
| Mission 3 | 51 von 60 entschieden, Mitte Zug 51 | 0 von 20 | 0 von 20 | so nicht zu gewinnen |
| Vier Reiche, Zufallskarte | 49 von 80 entschieden, Mitte Zug 53 | 8 von 20 | 12 von 20 | zu lang, 41 Partien enden erst im Sturm |

### Vermutet, nicht gemessen

- Dass Block 1 auch Mission 2 und die Karte mit vier Reichen kürzer macht. Inzwischen grob gemessen
  (Abschnitt 14): bei vier Reichen etwas, bei Mission 2 nicht. Dort sind eigene Zahlen je Mission nötig
  (Block 4 und 5).
- Die Zielwerte für Siege in den Blöcken 3 und 4 sind meine Vorschläge. Sie richten sich nach dem Duell, nicht
  nach einer Messung an Menschen.
- Der Aufwand je Block.

## 14 · Block 1: Gegner, die zu Ende spielen (21.11.2026)

### Was neu ist

- **Durchbruch.** Ein Computerreich, das keinen Angriff mehr findet, greift ein Feld mit allem an und lässt die
  Felder dahinter nachrücken. Vorher kam es an einem vollen Feld oder einer Burg nicht vorbei, wenn es sie nur
  von einer Seite berührte. Das war die Ursache für das „Abwarten“ (gemessen, siehe unten).
- **Verlegen.** Reicht der Durchbruch nicht, bringt das Reich Truppen aus dem Hinterland hinter die Front. Im
  Zeitraffer sieht man sie marschieren, und in der Liste steht „zieht Truppen zusammen“.
- **„Schwer“ anders eingestellt:** keine eigene zweite Welle mehr, dafür stoßen frisch eroberte Felder weiter
  vor, und es wird seltener gebaut. Mit der zweiten Welle tauschten zwei gleich starke Reiche endlos Felder.
- **Messwerkzeug:** `node tools/simulate-turns.mjs 60` misst jetzt auch den „Wartenden“, der nie einen Befehl
  gibt.
- **Stellschrauben** (alle in `TURN_DIFFICULTY` in `src/sim/rules.js`): neu `patience` (Züge ohne Angriff bis zum
  Durchbruch) und `push` (Vorstoßen nach einer Eroberung). Bei „Schwer“ geändert: `waves` 1 → 0, `build`
  0,45 → 0,2.
- **Das Echtzeitspiel ist unverändert.** Seine Tests laufen weiter grün.

### Abnahme

Gemessen mit `node tools/simulate-turns.mjs 60`, Duell, 60 Karten je Stufe. Vorher zwei Würfelsätze, nachher drei
(`--shift=1`, `--shift=2`).

| Kriterium | vorher | nachher | erreicht? |
|---|---|---|---|
| 1 · Wer nichts tut, verliert 60 von 60 | Leicht 59 · 59, Normal 59 · 59, Schwer 60 · 60 | alle Stufen 60 · 60 · 60 | **ja** |
| 2 · höchstens 2 von 60 Partien mit 5 Zügen ohne Angriff | Leicht 8 · 10, Normal 4 · 3, Schwer 2 · 1 | Leicht 0 · 1 · 1, Normal 0 · 0 · 1, Schwer 0 · 0 · 0 | **ja** |
| 3 · Schwer, Computer gegen Computer: mindestens 100 von 120 entschieden | 93 · 84 | 101 · 91 · 92 | **nein**: besser, aber nur in einem von drei Sätzen |
| 4 · Stufen klar verschieden (Siege des Anfängers von 60) | Leicht 56 · 55, Normal 42 · 41, Schwer 6 · 11 | Leicht 58 · 55 · 59, Normal 41 · 42 · 36, Schwer 8 · 10 · 15 | **ja** |

### Alle Werte nachher

| Stufe | Computer gegen Computer entschieden | Ende in Zug (Mitte) | Anfänger siegt | Kluger siegt | Burg des Wartenden fällt in Zug (Mitte) |
|---|---|---|---|---|---|
| Leicht | 107 · 108 · 109 von 120 (vorher 100 · 107) | 39 · 39 · 40 (vorher 41 · 42) | 58 · 55 · 59 | 59 · 59 · 57 | 26 · 26 · 26 |
| Normal | 111 · 105 · 106 (vorher 104 · 98) | 33 · 30 · 34 (vorher 36 · 35) | 41 · 42 · 36 | 40 · 48 · 44 | 22 · 21 · 22 |
| Schwer | 101 · 91 · 92 (vorher 93 · 84) | 38 · 42 · 42 (vorher 42 · 41) | 8 · 10 · 15 | 27 · 17 · 23 | 20 · 19 · 20 |

- **Offene Partien gegen „Schwer“** (kein Sieger bis Zug 80, von 60): beim Anfänger 6 · 8 · 8 (vorher 13 · 16),
  beim Klugen 8 · 16 · 11 (vorher 14 · 11). Für den Anfänger also besser, für den Klugen gleich.
- **Verlegt wird selten:** höchstens 0,01 Befehle je Zug. Der Computer tut es nur, wenn er festsitzt.

### Der Weg dorthin (immer eine Stellschraube, je 60 Karten)

| Versuch | Computer gegen Computer entschieden | Siege Anfänger / Kluger | Urteil |
|---|---|---|---|
| Durchbruch sofort, in jedem Zug ohne Angriff (Geduld 0), Normal | 51 von 120 | 7 / 21 | verworfen: viel zu stark, und die Reiche verkeilen sich |
| Durchbruch nach 1 Zug (Normal) | 110 · 106 | 42 · 42 / 40 · 47 | gewählt |
| Durchbruch nach 2 Zügen (Leicht) | 106 · 109 | 58 · 55 / 59 · 59 | gewählt |
| Schwer nur mit Durchbruch, zweite Welle wie bisher | 94 · 84 · 80 · 80 | 6 · 12 · 5 · 12 / 22 · 24 · 23 · 20 | das Verkeilen bleibt |
| Schwer ohne zweite Welle, mit Vorstoßen | 112 · 101 · 97 | 18 · 19 · 17 / 33 · 37 | entscheidet mehr, aber zu leicht für den Klugen |
| dazu seltener bauen: 0,3 | 107 · 86 · 100 | 18 · 12 · 16 / 29 · 29 · 32 | noch zu leicht |
| dazu seltener bauen: 0,2 | 100 · 93 · 90 · 96 | 8 · 10 · 15 · 16 / 28 · 17 · 23 · 17 | gewählt: so stark wie vorher, entscheidet mehr |
| dazu seltener bauen: 0,1 | 92 · 85 · 82 | 6 · 8 · 8 / 19 · 16 · 16 | stärker, verkeilt sich wieder |
| „Burg nehmen, sobald es mit allem geht“ | 94 · 84 | unverändert | kein Unterschied, wieder ausgebaut |
| andere Zahlen bei Schwer (Seiten 6, Vorsprung 1,05, Frontwache 3, 4 und 7, Burgwache 16) | 92 bis 115 | | kein Unterschied oder zu leicht |

Diese Versuche sind ohne das Verlegen gemessen. Mit Verlegen stehen die Werte in „Alle Werte nachher“.

### Was offen bleibt: das Verkeilen auf „Schwer“

- **Gemessen:** Je angriffslustiger ein Gegner eingestellt ist, desto besser schlägt er die Testspieler, und
  desto öfter verkeilen sich zwei von seiner Sorte. Beide tauschen dann jeden Zug gleich viele Felder. Mit den
  Zahlen des Gegners allein bekomme ich nicht beides: „Schwer“ wirklich schwer und fast jede Partie entschieden.
- **Gemessener Versuch, nicht eingebaut:** „Im Sturm wächst nichts mehr nach.“ Schwer: 109 · 94 von 120
  entschieden (statt 94 · 84 beim sonst gleichen Stand), und „Schwer“ bleibt dabei so stark wie vorher. Aber die
  restlichen Partien enden dann mit leeren Feldern, in denen niemand mehr angreifen kann.
- **Vermutet:** Sauber wird es erst mit einer Regel für das Ende, etwa „an der Zuggrenze gewinnt, wer mehr
  Felder hat“. Das ist eine Regel und keine Zahl. Deshalb entscheidest du das, zusammen mit der Frage, wie lang
  eine Partie sein soll.

### Die anderen Karten, grob (20 Karten, Normal, ein Würfelsatz)

| Karte | Computer gegen Computer entschieden | Ende Mitte | Anfänger / Kluger siegen | gegenüber Abschnitt 13 |
|---|---|---|---|---|
| Mission 1 | 40 von 40 | Zug 24 | 13 / 15 von 20 | gleich |
| Mission 2 | 5 von 40 | Zug 57 | 9 / 18 von 20 | gleich: Die Pässe brauchen eigene Zahlen (Block 4) |
| Mission 3 | 54 von 60 | Zug 49 | 0 / 0 von 20 | gleich: weiter nicht zu gewinnen (Block 4) |
| Vier Reiche | 57 von 80 | Zug 48 | 3 / 12 von 20 | etwas kürzer (vorher 49 von 80, Zug 53); für den Anfänger schwerer (vorher 8) |

### Wie geprüft

- **Tests:** `node --test`, 103 Tests grün (5 neue): Durchbruch, Verlegen, Zählen der Züge ohne Angriff, „wer
  nichts tut, verliert auf jeder Stufe ohne lange Pause“, und der Zeitraffer mit Verlegen endet auf demselben
  Brett wie die direkte Rechnung.
- **Browser** (eingebauter Browser, 800 × 600, Stufe Normal): die Karte, auf der die Burg vorher bis zur
  Zuggrenze stand. Ich habe nur „Zug beenden“ gedrückt. Die Burg fiel in Zug 23, in Zug 16 hat der Gegner
  Truppen verlegt, die Liste zeigte „zieht Truppen zusammen“, am Ende kam „Niederlage“. Keine Fehlermeldung.
- **Nicht geprüft:** das Handyformat (an der Oberfläche hat sich nur eine Zeile Text geändert) und, wie in
  Abschnitt 11, das Tempo bei sichtbarem Fenster. Die Ansicht war wieder ausgeblendet, ich habe die Bilder von
  Hand angetrieben. Den Marsch beim Verlegen habe ich deshalb nicht als Bild gesehen, nur als Ablauf im Protokoll.

## 15 · Block 2: Zeitraffer und Lesbarkeit (gebaut, noch nicht abgenommen)

### Erster Stand (21.11.2026) und deine Rückmeldung (22.11.2026)

Der erste Stand zeigte jeden Gegnerbefehl mit Pfeilen in der Farbe des Gegners und dem Ergebnis am Feld. Du hast
ihn online gespielt. Deine Rückmeldung, wörtlich:

> „finde man sollte trotz rundenmodus truppenbewegungen wie in der vorigen version sehen, das sieht hübscher aus.
> die pfeile sind lesbar, aber sehen etwas billig aus und schwer bezüglich kontrast erkennbar (z.b. rot auf rot).
> wäre evtl auch gut wenn man pro runde den income sehen kann der jeweiligen felder und wovon dieses abhängt oder
> wird das dann zu voll? ist nur eine idee. tempo von gegner passt“

So habe ich sie verstanden (meine Lesart):
- „Vorige Version“ ist das Echtzeitspiel. Dort sieht man alle Truppen marschieren, auch die eigenen. Im
  Rundenmodus geschahen deine eigenen Befehle ohne Marsch, auf einen Schlag.
- Die Pfeile sollen schöner werden und sich auch auf Feldern in der Farbe des Gegners abheben.
- Der Zuwachs je Feld soll sichtbar sein, ohne dass die Insel zu voll wird.

### Was jetzt gebaut ist (22.11.2026)

- **Deine eigenen Truppen marschieren.** Nach einem Angriff oder Verlegen laufen die Figuren los, mit ihrer
  Zahl, wie im Echtzeitspiel. Kommen sie an, wird gekämpft oder eingezogen. Der Marsch dauert eine halbe
  Sekunde (bei „Ruhig“ 0,7).
  - **Er hält dich nicht auf.** Der nächste Befehl, „Rückgängig“ oder „Zug beenden“ lässt die Truppen sofort
    ankommen. Der Befehl zählt schon als verbraucht, während sie laufen.
- **Helle Spur statt Pfeil.** Hinter jeder marschierenden Kolonne zieht sich eine helle Spur mit dunklem Rand,
  die nach hinten ausläuft. Sie hebt sich auf jeder Feldfarbe ab. Wem die Truppen gehören, zeigen die Figuren
  und ihre Zahl.
- **Ring am Ziel.** Das Feld, zu dem ein Befehl geht, trägt einen Ring in der Farbe des Reichs mit hellem Rand.
  Solange die Truppen laufen, pulsiert er leicht.
- **Ergebnis am Feld** (nur bei Gegnern, du kennst deines aus der Vorschau): ✓ und wie viele eingezogen sind,
  oder ✗ und wie viele Verteidiger übrig sind.
- **Zuwachs am Zugbeginn.** Wenn du wieder dran bist, steigt über jedem deiner Felder kurz auf, was es gerade
  bekommen hat, etwa „+2“, an der Burg „+6“. Volle Felder zeigen nichts, weil sie nicht wachsen. Ein Verlust
  steht rot da, etwa „−4“ bei einem abgeschnittenen Feld. Nach knapp 2 Sekunden ist alles wieder weg.
- **Auskunft am gewählten Feld.** Tippst du ein eigenes Feld an, steht darüber, was es pro Zug bekommt und
  warum: „Wiese +2/Zug · bis 20“, mit Hof „Wiese +4,5/Zug · davon Hof 2,5 · bis 20“, „voll (20) · wächst nicht
  weiter“ oder „abgeschnitten · −4/Zug“.
- **Unverändert:** die Zahlen an allen marschierenden Gegnern und die längere Pause nach einem Gegnerangriff
  (0,6 Sekunden bei „Normal“).

### Tempo

| Tempo | ein Gegnerangriff (Marsch und Ergebnis) | ein Gegnerzug mit 3 Angriffen | Marsch deiner eigenen Truppen |
|---|---|---|---|
| Ruhig | 1,9 s | 7,1 s | 0,7 s |
| Normal | 1,4 s | 5,3 s | 0,5 s |
| Schnell | 0,8 s | 3,2 s | 0,3 s |

- Die Tabelle ist aus den eingestellten Zeiten **gerechnet**.
- **Gemessen** bei „Ruhig“: ein Gegnerzug mit 1 Angriff 3,4 s, mit 2 Angriffen 5,4 s (Bilder von Hand angetrieben)
  und 4,6 s (sichtbares Fenster). Das passt zur Rechnung.
- **Gemessen im sichtbaren Fenster** (22.11.2026): Der Zeitraffer lief mit 50 oder mehr Bildern pro Sekunde.
- **Dein Urteil:** Das Tempo der Gegner passt.

### Abnahme

| Kriterium | Stand |
|---|---|
| Du kannst jedem Gegnerzug folgen, ohne zu suchen (dein Urteil) | **zum Teil:** Die Pfeile waren lesbar, das Tempo passt. Dein Urteil zur neuen Spur fehlt noch. |
| Das Tempo ist bei sichtbarem Fenster gemessen | **ja** (siehe oben) |
| Du hast eine Partie auf deinem Handy gespielt, ohne dass etwas klemmt | **offen**, braucht deinen Test |

### Wie geprüft

- **Tests:** `node --test`, 108 Tests grün. Neu seit dem ersten Stand: Ein eigener Befehl marschiert erst und
  endet dann auf genau demselben Brett wie der Befehl direkt in den Regeln. Der nächste Befehl, „Rückgängig“ und
  „Zug beenden“ lassen die Truppen sofort ankommen. Spur, Ring, Ergebnis, Zuwachs und Feld-Auskunft werden
  gezeichnet.
- **Browser** (eingebauter Browser, Stufe Normal, 800 × 676): Bilder gesehen von einem eigenen Angriff mit vier
  Kolonnen im Marsch, von einem Gegnerangriff mit Ring, vom Ergebnis „✓ 6“ mit Ring, vom Zuwachs über allen
  eigenen Feldern und von der Auskunft „Wiese +2/Zug · bis 20“. Keine Fehlermeldung.
- **Nicht geprüft:**
  - Das Handyformat für die neuen Teile. Meine Bilder dort trafen den falschen Moment. Die Aufteilung der
    Oberfläche hat sich nicht geändert.
  - Ein echtes Handy.

### Aufgefallen

- **Die Feld-Auskunft kann die Zahl des Felds darüber verdecken** (gesehen). Sie steht nur, solange das Feld
  gewählt ist.
- **Ein gerade erobertes Feld zeigt am nächsten Zugbeginn manchmal „−10“** (gesehen). Das ist richtig: Es zogen
  mehr Truppen ein, als das Feld nährt, und der Überschuss schmilzt. Ob das verwirrt, zeigt dein Test.
- **Bei einem Angriff von mehreren Seiten liegen die Zahlen der Kolonnen am Ziel übereinander** (gesehen).
- **Bei drei Gegnern wird der Zeitraffer lang** (gerechnet: bis 21 Sekunden pro Runde bei „Ruhig“). Das gehört zu
  Block 5.

### Noch offen aus deinen Antworten

Bauen, Zahl der Befehle und Spannung (Abschnitt 12) sind nicht beantwortet. Daran habe ich nichts geändert.

## 16 · Erklärungen im Spiel (22.11.2026)

### Deine Fragen und was vorher galt

Du hast gefragt, ob klar ist, was Turm und Hof bringen, wie viel ein Feld einbringt, ob erhöhte Felder mehr
kosten als ihre Zahl, und ob man den Nachschub-Schalter im Rundenmodus braucht. Der Stand davor (im Code
nachgelesen):

- **Turm und Hof:** Die Hilfe des Rundenmodus sagte nur, wie man baut, nicht wozu. Die Erklärung stand nur in der
  Hilfe des Echtzeitspiels.
- **Zuwachs je Feld:** nirgends, nur als Summe am Rand auf breiten Bildschirmen.
- **Deckung:** nirgends. Die Zahl am Feld ist nur die Besatzung.

### Was jetzt gebaut ist

- **Hilfe im Rundenmodus,** drei neue Absätze: Turm und Hof (Preis, Nutzen, wo es lohnt), Zuwachs je Gelände und
  die Grenzen, Deckung je Gelände mit einem Beispiel.
- **An den Bau-Knöpfen** steht, was das Gebäude bringt: „+60 % Deckung“ und „+2,5/Zug“. Steht dem Bau etwas im
  Weg, steht dort wie bisher der Grund („ab 11 Truppen“).
- **In der Angriffs-Vorschau** steht über dem Ergebnis, was die Verteidiger deckt und wie stark, etwa
  „Hügel · Deckung +45 %“ oder „Hügel + Turm · Deckung +105 %“. Auf offener Wiese steht nichts. Im Sturm sinkt
  die Zahl mit, weil er die Deckung abbaut.
- **Die Auskunft am gewählten Feld** verschwindet, solange eine Angriffs-Vorschau steht, damit sich die beiden
  nicht überdecken.
- **Nur im Rundenmodus.** Das Echtzeitspiel zeigt nichts davon.

### Die Zahlen (aus den Regeln, die Angreifer mit dem echten Kampf gerechnet)

| | Nutzen | Preis |
|---|---|---|
| Turm | +60 % Deckung für die Besatzung | 10 Truppen, jeder weitere 5 mehr, 1 Befehl |
| Hof | +2,5 Truppen pro Zug auf dem Feld, nur auf Wiese | 8 Truppen, jeder weitere 3 mehr, 1 Befehl |

So viele Angreifer braucht ein Feld (von einer Seite / von zwei Seiten):

| Besatzung | Wiese | Wald (+25 %) | Hügel (+45 %) | Wiese mit Turm | Hügel mit Turm |
|---|---|---|---|---|---|
| 8 | 9 / 9 | 10 / 9 | 10 / 10 | 11 / 11 | 13 / 12 |
| 12 | 14 / 13 | 16 / 14 | 18 / 15 | 19 / 16 | 23 / 18 |
| 20 | 30 / 21 | 36 / 24 | 41 / 27 | 45 / 29 | 56 / 34 |

### Wie geprüft

- **Tests:** `node --test`, 110 Tests grün (2 neue). Einer vergleicht jede Zahl in den neuen Hilfe-Absätzen mit
  den Regeln und rechnet die Angreifer-Beispiele mit dem echten Kampf nach. Ändert jemand eine Regel, schlägt
  der Test an, bis die Hilfe stimmt.
- **Browser** (eingebauter Browser, 800 × 827 und Handyformat 375 × 812): Hilfe mit den neuen Absätzen (sie
  lässt sich scrollen), Bau-Knöpfe mit „+60 % Deckung“ und „+2,5/Zug“, Vorschau auf einen Hügel mit „Hügel ·
  Deckung +45 %“. Keine Fehlermeldung.

### Noch nicht entschieden (deine Fragen, meine Einschätzung)

- **Nachschub an/aus.** Der Nachschub arbeitet auch im Rundenmodus, am Ende deines Zugs. Der Schalter nützt nur
  beim Bauen, weil der Nachschub das Hinterland sonst jeden Zug leert. Vermutet, nicht gemessen: Als
  Alles-oder-nichts-Schalter verwirrt er eher. Besser wäre, der Nachschub lässt von selbst genug für ein Gebäude
  stehen. Nicht angefasst.
- **Karte drehen.** Technisch nah (die Kamera hat schon einen Winkel). Mein Vorschlag: ein Knopf, der in
  Schritten von 60 Grad dreht, statt freiem Drehen; Aufwand geschätzt 1 Sitzung, nach den Missionen. Nicht
  angefasst.

