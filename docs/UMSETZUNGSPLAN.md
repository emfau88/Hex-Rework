# Umsetzungsplan · HexWars im Diorama-Look

Arbeitstitel **One Crown** · Stand 17.11.2026 · Prototyp 0.1

## 1 · Kurzfassung

Aus dem 2D-HEXFRONT wird ein neues Spiel im Look der Territory-Wars-Shorts: plastische Hex-Insel, Burgen,
marschierende Speerträger, bis zu vier Reiche. Der Prototyp in diesem Ordner ist spielbar und zeigt, dass
Look und Bedienung zusammen funktionieren. Der Plan unten führt in fünf Phasen vom Prototyp zur
Portal-Veröffentlichung. Der größte offene Punkt ist kein technischer: Ob das Spiel Spaß macht, entscheidet
erst dein Spieltest am echten Handy.

## 2 · Ausgangslage und Ziel

| | HEXFRONT (live auf Kongregate) | Dieses Projekt |
|---|---|---|
| Darstellung | flaches 2D, Canvas | 3D-Diorama, WebGL2, keine Bild- oder Modelldateien |
| Gegner | genau einer | ein bis drei Reiche gleichzeitig |
| Entscheidungen | Truppen schicken (50 %, 100 %, Gruppe) | schicken, Turm bauen, Hof bauen, Burg schützen |
| Partieende | Basis erobern, teils zäh | Burg erobern, ganzes Reich wechselt die Farbe; Sturmphase erzwingt ein Ende |
| Umfang | zehn feste Level | drei Missionen plus Zufallskarte (Prototyp) |

**Ziel:** ein Spiel, das in den ersten zehn Sekunden hochwertig aussieht, in drei bis fünf Minuten eine
Partie mit Wendungen liefert und optisch nahtlos an die Shorts anschließt („Pick your color" wird wörtlich).

**Vermutete Gründe für die mittelmäßigen Bewertungen** (Annahmen, nicht gemessen): flache Optik ohne
Bewegung, nur ein Gegner, wenig Entscheidungen neben dem Schicken, kein Grund zum Wiederspielen.
Die Kongregate-Statistik je Level sollte das vor Phase 3 bestätigen oder widerlegen.

## 3 · Was der Prototyp heute kann

**Starten:** `start.bat` doppelklicken (PC) oder `start-handy.bat` (zeigt die Adresse fürs Handy im selben WLAN).

- Drei Missionen (Duell mit Einführung, drei Reiche, vier Reiche) und Zufallskarten, drei Gegnerstärken.
- Farbwahl aus den vier Reichen der Shorts: AZUR, EMBER, JADE, SOLAR.
- Hochformat-Insel am Handy, Querformat-Insel auf breiten Bildschirmen; die Kamera passt ihre Neigung an.
- Bedienung wie in HEXFRONT: ziehen oder erst Feld, dann Ziel antippen. Zusätzlich laufen Truppen
  selbstständig durch eigenes Gebiet zum Ziel, und der Pfeil zeigt vorab „9 vs 6".
- Bauen: Turm (+60 % Verteidigung) und Hof (mehr Truppen). Reicht es noch nicht, spart das Feld darauf.
- Automatischer Nachschub aus dem Hinterland an die Front, abschaltbar.
- Kronenregel aus dem Short: Wer eine Burg nimmt, bekommt das ganze Reich. Die Farbe flutet von der Burg aus.
- Sturmphase ab 3:30: Mauern bröckeln, Verteidiger zählen weniger, jede Partie endet.
- Ergebnis mit drei Sternen, Pause mit Kurzanleitung, Deutsch und Englisch, erzeugte Klänge ohne Dateien.
- Im Menü läuft im Hintergrund eine Partie der Computerreiche mit Einblendungen wie im Short.

### Gemessen (Computer gegen Computer, `node tools/simulate.mjs 60`)

| Karte, Stärke „Normal" | Dauer (Median) | erste Burg fällt | festgefahren (15 min) | Untätiger Spieler verliert nach |
|---|---|---|---|---|
| Duell | 4:15 | 4:26 | 2 von 60 | 1:31 |
| Drei Reiche | 2:04 | 1:39 | 0 von 60 | 1:42 bis 2:11 |
| Vier Reiche | 3:32 | 1:46 | 2 von 60 | 1:31 |

Ein Spieler auf dem Niveau der schweren KI gewinnt die Vier-Reiche-Karte gegen „Leicht" in 60 von 60,
gegen „Normal" in 43 von 58 und gegen „Schwer" in 11 von 60 Partien. Das ist ein Ersatzmaß, kein Spieltest.

### Geprüft und nicht geprüft

| Geprüft | Wie |
|---|---|
| Alle Abläufe: Menü, Start, Befehl, Bauen, Burgfall, Sieg, Niederlage, Pause, Sprache | im Browser, 375 × 812 und 1280 × 720 |
| Darstellung ohne Fehler, Bildaufbau unter 1 ms | PC mit integrierter AMD-Grafik |
| Regeln, Fairness im Duell und auf der Vier-Reiche-Karte, Partiedauer | 60 bis 300 simulierte Partien je Einstellung |

| Nicht geprüft | Folge |
|---|---|
| Echtes Handy (Leistung, Finger statt Maus) | erster Punkt in Phase 1 |
| Ton | nur technisch gestartet, nicht gehört |
| Spielspaß und Schwierigkeit mit Menschen | entscheidet über Phase 2 |
| Safari und iOS | offen |

### Bekannte Schwächen

- Auf der Drei-Reiche-Karte gewinnt der untere Startplatz in der Simulation fast immer (58 von 60). Für
  Mission 2 ist das als leichter Einstieg vertretbar, für Zufallskarten nicht.
- Im Querformat sind die vier Startplätze auf „Normal" ungleich (29, 69, 46, 50 Siege in 194 Partien).
  Ursache ist noch nicht gefunden; der Platz des Spielers ist geometrisch nicht benachteiligt.
- Die KI greift nur Felder direkt an ihrer Grenze an und plant keine Züge über mehrere Schritte.
- Kein Zoomen oder Verschieben, kein Speichern mitten in der Partie.
- Der Name „One Crown" ist nicht auf Verwechslungsgefahr geprüft.

## 4 · Spielkonzept

**Kernschleife:** Felder liefern Truppen. Truppen erobern Felder. Wer die Burg eines Reiches nimmt, erbt das
Reich. Die letzte Krone gewinnt.

| Regel | Wert im Prototyp | Zweck |
|---|---|---|
| Zuwachs je Feld | 0,3 pro Sekunde, Burg 1,3, Zitadelle 1,4 | Burg und Zitadelle sind die Ziele auf der Karte |
| Verteidigung | Wald ×1,25, Hügel ×1,45, Turm +0,6, Burg +0,4 | Gelände lesen lohnt sich |
| Marsch | 0,8 s je Feld | Entfernung ist eine Entscheidung |
| Versorgung | Feld wächst nur mit Verbindung zur eigenen Burg | Abschneiden wird zur Taktik |
| Baukosten | Turm 10, Hof 8, jeder weitere +5 bzw. +3 | niemand mauert die ganze Grenze zu |
| Ruhige Eröffnung | KI greift Burgen erst nach 50 bis 150 s an | Einsteiger überleben die erste Minute |
| Sturm | ab 3:30, nach 2 min zählen Verteidiger halb | jede Partie endet |

Alle Werte stehen in `src/sim/rules.js`.

**Was aus den Shorts stammt:** vier Reiche mit Namen und Farben, Kronenregel, Farbflut, Einblendungen
(„EMBER FÄLLT"), Speerträger, Zitadelle in der Mitte, Kamera und Licht.
**Was aus HEXFRONT stammt:** Ziehen und Tippen, Sendemodus 50 % und 100 %, Nachschub, Aufbau der
Handy-Ansicht (Leiste oben, großer Sendeknopf unten), Hinweiszeile in der Einführung.

### Ideen für später (noch nicht gebaut, nach Wirkung sortiert)

1. **Helden oder Fähigkeiten mit Abklingzeit**, eine je Reich (Sturmangriff, Schildwall, Eilmarsch).
2. **Tageskarte:** ein fester Startwert pro Tag, Bestzeit vergleichen.
3. **Kampagne mit je einer neuen Regel pro Mission:** Brücken, Nebel, Verbündete, König in Bewegung.
4. **Dauerhafte Freischaltungen:** Banner, Burgformen, Startboni.
5. **Sammelbefehl:** Doppeltipp zieht Truppen aller Nachbarfelder zusammen.

## 5 · Darstellung

- **Technik:** eigener WebGL2-Renderer (rund 1.200 Zeilen mit Modellen), keine Bibliothek. Felder, Burgen, Bäume und
  Soldaten entstehen im Code. Die Besitzfarbe kommt aus einer kleinen Datentextur, deshalb kostet ein
  Farbwechsel keinen Neuaufbau. Soldaten sind ein Modell, das vervielfacht gezeichnet wird.
- **Stil:** Palette, Licht und Proportionen folgen dem Territory-Renderer des Endless Battle Simulator.
  Der Code ist neu geschrieben und für ein Spiel gebaut (Antippen, Anheben, Vorschau).
- **Lesbarkeit:** hinten Kulisse und Gebäude, in der Mitte die Garnison, vorn die Zahl. Zahlen und Pfeile
  liegen auf einer eigenen 2D-Ebene und bleiben in jeder Auflösung scharf.
- **Offen für Phase 2:** Wasser mit Ufer, Brücken, Jahreszeiten je Mission, Kampfanimation an der Grenze,
  Banner beim Burgfall, Qualitätsstufen für schwache Handys.

## 6 · Handy-Ansicht

Orientiert an der HEXFRONT-Fassung auf Kongregate:

- Insel füllt die Breite; Felder sind bei 375 Pixeln etwa 50 Pixel breit.
- Oben: Pause, Anteilsbalken aller Reiche mit Feldzahl, Uhr. Unten: großer Sendeknopf, Turm, Hof, Nachschub.
- Sichere Bereiche für Notch und Gestenleiste sind berücksichtigt.
- Einführung zeigt die Ziehgeste mit einem wandernden Punkt.

**Abnahme am Handy (Phase 1):** Zahlen ohne Zoomen lesbar, kein Fehlgriff auf Nachbarfelder in zehn
Befehlen hintereinander, flüssig über eine ganze Partie, Leisten verdecken kein Reich.

## 7 · Aufbau des Projekts

```
index.html, styles.css      Seite, Leisten, Menüs
src/sim/                    Regeln ohne Browser: rules, maps, game, ai (läuft auch in Node)
src/render/                 WebGL2: glutil, mesh, models, renderer
src/ui/                     overlay (Zahlen, Pfeil), i18n, store
src/audio/sfx.js            erzeugte Klänge
src/input.js, src/main.js   Bedienung, Spielschleife, Bildschirme
tools/simulate.mjs          Testpartien ohne Browser
serve.mjs, start*.bat       lokaler Server
```

Regeln und Darstellung sind getrennt. Dadurch laufen Balance-Tests in Sekunden ohne Browser, und die
Darstellung lässt sich ändern, ohne die Regeln anzufassen.

**Aus dem hexwars-Repo übernehmen (Phase 5), nicht neu bauen:** `src/platform/KongregateStats.ts`,
`Y8PortalAdapter.ts`, `GameMonetizePortalAdapter.ts`, die Paketskripte `scripts/package-*.mjs`, das
Muster von `SafeStorage` und die Browser-Tests als Vorlage.

**Empfehlung:** als eigenes, schlankes Repository weiterführen. Das hexwars-Repo wiegt 618 MB und enthält
vier Spielvarianten. HEXFRONT bleibt live, bis das neue Spiel nachweislich besser ankommt.

## 8 · Phasen

### Phase 0 · Prototyp — erledigt

Dieser Ordner. Ergebnis: Look und Bedienung funktionieren zusammen.

### Phase 1 · Dein Spieltest und die Entscheidung

Dauer: ein Abend für dich. Bitte am echten Handy und am PC spielen und notieren:

1. Erster Eindruck in zehn Sekunden: wirkt es hochwertig?
2. Sind die Zahlen lesbar, trifft der Finger das richtige Feld?
3. Läuft es flüssig? Welches Handy?
4. Mission 1 ohne Erklärung verstanden?
5. Macht Mission 3 auf „Normal" Spaß? Zu leicht, zu schwer, zu schnell?
6. Fühlt sich die Kronenregel gut oder unfair an?
7. Klingt der Ton angenehm?

**Weiter, wenn** Punkt 1 bis 3 mit Ja beantwortet sind. Punkt 4 bis 7 bestimmen die Reihenfolge in Phase 2.
**Abbruch oder Kurswechsel, wenn** die Zahlen am Handy nicht lesbar zu machen sind oder es ruckelt.

### Phase 2 · Spielgefühl (2 bis 3 Arbeitssitzungen mit mir)

- Balance nach deinem Test; Schwierigkeit über gemessene Siegquoten einstellen.
- KI plant Angriffe über mehrere Felder, bekommt je Reich einen Charakter (vorsichtig, gierig, rachsüchtig).
- Kampf sichtbar machen: Soldaten treffen aufeinander, Trümmer beim Burgfall, Banner, Zeitlupe beim Sieg.
- Zoomen und Verschieben mit zwei Fingern, Sammelbefehl.
- Einführung über zwei kurze Missionen, jede lehrt genau eine Sache.
- Startplätze auf allen Karten fair (Ziel: kein Platz unter 20 % oder über 30 % bei vier Reichen).

**Fertig, wenn** drei Testpersonen Mission 1 bis 3 ohne Hilfe spielen und freiwillig eine weitere Partie starten.

### Phase 3 · Inhalt (3 bis 4 Sitzungen)

- Kampagne mit 12 bis 15 Missionen, jede mit einer eigenen Idee und eigener Landschaft.
- Zufallskarte mit Kartengröße und Zahl der Reiche, Tageskarte.
- Drei Sterne je Mission mit klaren Zielen, Freischaltungen.
- Eine Fähigkeit je Reich, falls Phase 2 zeigt, dass Entscheidungen fehlen.

**Fertig, wenn** der Inhalt für etwa zwei Stunden reicht und jede Mission in der Simulation in unter
sieben Minuten endet.

### Phase 4 · Technik für die Veröffentlichung (2 bis 3 Sitzungen)

- Bündelung zu wenigen Dateien, Qualitätsstufen, Verhalten bei verlorenem Grafikkontext.
- Speichern des Fortschritts robust, Fortsetzen nach Tabwechsel.
- Automatische Tests: Regeln, Karten, ein vollständiger Browser-Durchlauf am Handy-Format.
- Tastatur, reduzierte Bewegung, Farbschwäche (Muster zusätzlich zur Farbe).
- Leistung auf drei echten Geräten gemessen, darunter ein älteres Android.

### Phase 5 · Portale (2 Sitzungen plus Prüfzeit der Portale)

- Kongregate, Y8, GameMonetize: Adapter und Paketskripte aus hexwars übernehmen.
- Statistiken je Mission (gestartet, gewonnen, Dauer), damit Abbrüche sichtbar werden.
- Icon, Screenshots und Trailer direkt aus dem Spiel und aus der Short-Pipeline.
- Name rechtlich prüfen, dann Titelbild und Wortmarke.

### Phase 6 · Start und Auswertung

- Short mit „Pick your color" und Link zum Spiel am selben Tag.
- Nach einer Woche auswerten: Bewertung, Anteil abgeschlossener erster Missionen, zweite Sitzung.
- Vergleich mit HEXFRONT entscheidet, ob das alte Spiel ersetzt wird.

## 9 · Aufwand

| Phase | Meine Arbeit | Deine Zeit |
|---|---|---|
| 1 Spieltest | keine | ein Abend |
| 2 Spielgefühl | 2 bis 3 Sitzungen | je Runde 30 Minuten testen |
| 3 Inhalt | 3 bis 4 Sitzungen | Missionen durchspielen |
| 4 Technik | 2 bis 3 Sitzungen | drei Geräte bereitstellen |
| 5 Portale | 2 Sitzungen | Konten, Uploads, Namensentscheidung |

Das sind Schätzungen. Der Engpass ist nicht das Programmieren, sondern die Testrunden dazwischen. Mit
einer Testrunde alle zwei bis drei Tage sind es etwa drei bis vier Wochen bis zum Portal-Upload.

## 10 · Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Schwache Handys ruckeln | Qualitätsstufen (Schatten aus, geringere Auflösung); früh in Phase 1 messen |
| Zahlen überdecken das Diorama | Zahlen nur für eigene und angrenzende Felder zeigen; in Phase 2 testen |
| Kronenregel wirkt unfair | als Missionsregel abschaltbar; Alternative: Burg gibt nur die Nachbarfelder |
| KI zu berechenbar | Charaktere und Mehrschritt-Angriffe in Phase 2 |
| Wieder nur ein neuer Anstrich | Phase 1 und 2 haben feste Kriterien; Inhalt erst nach bestandenem Spieltest |
| Rechte an der Stilvorlage | Territory-Quelle stammt aus einer geladenen HTML-Datei („SimCascade"). Falls sie nicht von dir ist, vor dem Upload klären |

## 11 · Entscheidungen, die bei dir liegen

1. **Name.** „One Crown" ist ein Arbeitstitel.
2. **Thema.** Mittelalter mit Burgen wie im Short, oder neutral halten?
3. **Verhältnis zu HEXFRONT.** Nachfolger unter neuem Namen oder großes Update?
4. **Einnahmen.** Werbung der Portale wie bisher, oder zusätzlich eine werbefreie Fassung?
5. **Mehrspieler.** Bewusst nicht im Plan; erst nach einem erfolgreichen Einzelspieler-Start sinnvoll.

## 12 · Erfolgsmaße

| Maß | Ziel |
|---|---|
| Bewertung auf Kongregate | klar über HEXFRONT |
| Erste Mission abgeschlossen | über 70 % der Starts |
| Zweite Partie in derselben Sitzung | über 50 % |
| Mittlere Partiedauer | 3 bis 5 Minuten |
| Bildrate auf einem Mittelklasse-Handy | stabil 50 bis 60 |
