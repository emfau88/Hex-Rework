# Rundenmodus · Plan und Regelentwurf

Entwurf 0.1 vom 19.11.2026 · Zweig `runden` · Nichts davon ist gebaut. Das öffentliche Spiel bleibt in Echtzeit, bis
du entscheidest.

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

Messwerkzeug und Rohwerte: die Skripte aus der Untersuchung vom 19.11.2026; sie sollen mit Schritt 2 als
`tools/` ins Projekt kommen.

## 2 · Leitlinien

1. **Planen statt Tippen.** Alle haben gleich viele Befehle pro Zug, auch die Gegner.
2. **Wenige, wichtige Entscheidungen.** Drei Befehle pro Zug: Was ist jetzt am wichtigsten?
3. **Was keine Entscheidung ist, läuft von selbst:** Wachsen und Nachschub.
4. **Kein Würfelglück.** Vor jedem Befehl zeigt die Vorschau das genaue Ergebnis.
5. **Der Kern bleibt:** Kampf an den Kanten, Umzingeln, Abschneiden.
6. **Die Insel bleibt lebendig:** Märsche und Kämpfe sieht man weiter, als kurze Wiedergabe.

## 3 · Regelentwurf 0.1

### Ablauf

- Die Reiche ziehen **nacheinander**. Du beginnst, danach ziehen die Gegner in fester Reihenfolge.
- Die Gegnerzüge rechnet der Computer sofort aus. Danach laufen sie als Zeitraffer, insgesamt wenige
  Sekunden. Ein Tipp überspringt die Wiedergabe.
- **Dein Zug:**
  1. **Zugbeginn:** Deine versorgten Felder wachsen. Dann verteilt der Nachschub deine Überschüsse an die Front.
     Abgeschnittene Felder verlieren Truppen.
  2. **Befehle:** bis zu 3.
  3. **Zug beenden** (Knopf). Nicht genutzte Befehle verfallen.

### Befehle (3 pro Zug)

| Befehl | So geht es | Kostet |
|---|---|---|
| **Angriff** | Ziel antippen: Alle eigenen Felder daneben greifen zusammen an (wie heute „Sturm“). Mit 50 % oder 100 % ihrer Truppen. Die Vorschau zeigt das Ergebnis, der zweite Tipp bestätigt. Gilt auch für freies Land. | 1 Befehl |
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
- **Gewinnt der Angreifer,** ziehen die Überlebenden ins Feld, höchstens 30. **Verliert er,** sind die Angreifer
  weg, und der Verteidiger behält, was übrig ist.
- **Warum sofort?** Heute dauern fast alle Kämpfe nur Sekunden, also weniger als ein Zug. Belagerungen über
  mehrere Züge bringen viel Aufwand für wenig Gewinn. Sie sind eine Option für später, etwa nur für Burgen.

### Wachsen, Nachschub, Abschneiden

- Ein Zug entspricht zum Start etwa 8 Sekunden der heutigen Spielzeit. Daraus ergeben sich die Startwerte in der
  Tabelle unten.
- Grenzen wie heute: Ein Feld nährt 20 Truppen, die Zitadelle 30, die Burg 40. Was durch Verschieben darüber
  liegt (bis +10), schmilzt bis zum nächsten eigenen Zug weg.
- **Nachschub bei Zugbeginn,** nach den heutigen Regeln:
  - Felder im Hinterland geben ihren Überschuss an Frontfelder mit Platz, Fronten zum Gegner zuerst.
  - Die Burg behält 32 Truppen, die sechs Felder um sie je 10.
  - Die Truppen kommen sofort an; man sieht sie kurz marschieren.
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

### Startwerte (alle werden in Schritt 2 gemessen und angepasst)

| | heute (pro Sekunde) | Rundenmodus (pro Zug) |
|---|---|---|
| Zuwachs Wiese, Wald | 0,24 | 2 |
| Zuwachs Hügel | 0,2 | 1,5 |
| Zuwachs Zitadelle | 0,6 | 5 |
| Zuwachs Burg | 0,8 | 6 |
| Hof zusätzlich | 0,3 | 2,5 |
| Abgeschnitten | −0,5 | −4 |
| Befehle | so viele man schafft | 3 |
| Frontbreite, Schaden, Deckung, Grenzen, Baupreise | wie heute | wie heute |

### Sondereinheiten (Skizze, nicht im Probebau)

Runden machen sie einfacher zu verstehen und abzustimmen:

- **Troll:** überfällt alle 5 Züge das schwächste Nachbarfeld und kündigt es einen Zug vorher an. Der Ring zählt
  die Züge herunter.
- **Ritter:**
  - Entsteht aus 15 Truppen eines Felds und kostet 1 Befehl. Jedes Reich hat höchstens einen.
  - Er zieht mit einem Angriff mit und stärkt dessen Kante, etwa mit mehr Frontbreite.
  - Fällt sein Feld, wird er gefangen.
- **Drache:** verbrennt alle 6 Züge das stärkste Feld, mit einem Zug Vorwarnung. Das hilft gegen Stapeln.

## 4 · Offene Fragen an dich

Zu jeder Frage steht meine Empfehlung dabei.

1. **Nacheinander oder alle gleichzeitig ziehen?** Empfehlung: nacheinander. Das ist am klarsten: Man sieht genau,
   was der Gegner getan hat.
2. **Wie viele Befehle pro Zug?** Empfehlung: 3, im Probebau zum Vergleich auch 2 und 4 messen.
3. **Kampf sofort zu Ende rechnen?** Empfehlung: ja. Belagerungen erst später, falls sie fehlen.
4. **Verschieben beliebig weit und sofort?** Empfehlung: ja. Möglich wäre auch „kommt erst nächsten Zug an“; das
   kostet aber Übersicht.
5. **Bauen nur, wenn die Truppen schon da sind (kein Ansparen)?** Empfehlung: ja.
6. **Rückgängig für den letzten Befehl?** Empfehlung: ja. Die Vorschau ist ohnehin genau, man gewinnt also nichts
   durch Ausprobieren.
7. **Wer beginnt?** Empfehlung: du. Gemessen wird, wie groß der Vorteil des ersten Zugs ist.
8. **Echtzeit behalten?** Empfehlung: bis zur Entscheidung (Schritt 6) ja, unverändert.

## 5 · Vorgehen in Schritten

Zu jedem Schritt steht, wann er fertig ist. Den Aufwand habe ich geschätzt, nicht gemessen.

| Schritt | Was | Fertig, wenn | Aufwand |
|---|---|---|---|
| 0 | Zweig `runden` und dieser Plan | Plan liegt vor | erledigt |
| 1 | Regeln festlegen | du hast die offenen Fragen beantwortet, Entwurf 0.2 steht | 1 Sitzung |
| 2 | Rundenkern ohne Grafik: Regeln, Gegner mit 3 Befehlen, Tests, Messwerkzeug „Computer gegen Computer“ | Partien auf dem Duell dauern 20 bis 35 Züge; wer beginnt, gewinnt höchstens 55 %; Leicht, Normal und Schwer sind klar verschieden | 2 bis 3 Sitzungen |
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
