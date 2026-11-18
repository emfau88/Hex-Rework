# One Crown · HexWars Diorama

## [▶ Jetzt im Browser spielen](https://emfau88.github.io/Hex-Rework/)

Läuft am PC und am Handy direkt im Browser, ohne Installation. Stand 0.3 vom 18.11.2026.

[![Mission 3: drei Reiche kämpfen um die Zitadelle in der Mitte](docs/bilder/stand-0.3-mission-3.jpg)](https://emfau88.github.io/Hex-Rework/)

Echtzeit-Strategie auf einer plastischen Hex-Insel. Nachfolger von HEXFRONT mit neuen Regeln: Stapeln reicht
nicht mehr, es zählt die Form der Front.

- **Was als Nächstes ansteht:** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Plan, Messwerte und bekannte Schwächen:** [docs/REWORK-PLAN.md](docs/REWORK-PLAN.md)

## Lokal starten

| Wo | Wie |
|---|---|
| PC | `start.bat` doppelklicken. Der Browser öffnet sich von selbst. |
| Handy | `start-handy.bat` doppelklicken. Im Fenster steht eine Adresse wie `http://192.168.x.x:4180/`. Diese im Handy-Browser öffnen (gleiches WLAN). |

Voraussetzung ist Node.js ab Version 20. Es wird nichts installiert und nichts heruntergeladen.
Zum Spielen über den Link oben braucht es das alles nicht.

## Die Regeln in vier Sätzen

1. **Versorgung:** Ein Feld versorgt 20 Truppen, die Burg 40, die Zitadelle 30. Was darüber liegt, schwindet.
   Eine gelbe Zahl heißt: Das Feld ist voll.
2. **Kampf an den Kanten:** Ein Kampf dauert. An jeder Feldkante kämpfen höchstens 8 Angreifer, alle
   Verteidiger wehren sich. Von drei Seiten kostet ein Angriff rund ein Drittel.
3. **Burgen fallen durch Umzingeln:** Erst die Felder um die Burg nehmen, dann von allen Seiten stürmen.
4. **Abgeschnitten schwindet:** Felder ohne Verbindung zur eigenen Burg wachsen nicht und verlieren Truppen.

Wer eine Burg erobert, bekommt das ganze Reich. Fällt die eigene Burg, ist die Partie verloren.

## Bedienung

- **Schicken:** von einem eigenen Feld auf ein Ziel ziehen. Oder erst das Feld, dann das Ziel antippen.
- **Vorhersage:** Am Pfeil steht `✓ 7` (das Feld fällt, 7 bleiben übrig) oder `✗ 12` (der Angriff scheitert,
  12 Verteidiger bleiben).
- **Sturm von allen Seiten:** ein fremdes Feld zweimal antippen. Alle eigenen Nachbarfelder greifen zugleich
  an. Nach dem ersten Tipp (am PC schon beim Überfahren mit der Maus) steht die Vorhersage für alle zusammen da.
- **Senden 50 % / 100 %:** Knopf unten links, am PC auch Tasten `1` und `2`.
- **Turm / Hof:** eigenes Feld antippen, dann bauen. Reicht es noch nicht, spart das Feld (goldener Punkt).
- **Nachschub:** schickt Truppen aus dem Hinterland an Frontfelder, die noch Platz haben.
- **Abbrechen:** `Esc`, rechte Maustaste oder das gewählte Feld erneut antippen.
- **Pause:** Knopf oben links, am PC Leertaste.

## Missionen

| Nr. | Name | Ziel | Neu |
|---|---|---|---|
| 1 | Erste Krone | Burg erobern | Feldgröße, Angriff von mehreren Seiten |
| 2 | Die zwei Pässe | Burg erobern | Türme, Abschneiden eines Vorpostens |
| 3 | Drei Reiche | Zitadelle samt den Feldern ringsum insgesamt 60 Sekunden halten, oder beide Burgen erobern | Zwei Rivalen, Kronenregel |

Jede Mission führt beim ersten Durchspielen in drei bis vier kurzen Schritten durch das, was neu ist. In
Mission 1 hält der Gegner bis zum letzten Schritt still.

Dazu „Gefecht“ auf Zufallskarten: ein Duell und eine Partie mit vier Reichen. Die Inseln sind gespiegelt,
jedes Reich startet auf genau gleichem Land.

## Prüfen ohne Browser

```bash
node --test tests/rules.test.mjs
```

```bash
node tools/simulate.mjs 60
```

```bash
node tools/showmap.mjs m2
```

```bash
node tools/regions.mjs m3
```

Die Messung zeigt je Karte und Stärke: Partiedauer, Siege je Startplatz, festgefahrene Partien, wie lange ein
untätiger Spieler überlebt, wie ein starker Testspieler abschneidet und ob der Stapel-Bot gewinnt.
Alle Stellschrauben stehen in `src/sim/rules.js`, die Karten als Textraster in `src/sim/missions.js`.

## Aufbau

```
src/sim/      Regeln (game), Zahlen (rules), Gegner (ai), Karten (maps, missions): läuft ohne Browser
src/render/   WebGL2-Diorama: Modelle, Licht, Schatten, Belagerer an den Kanten
src/ui/       Zahlen, Pfeile und Vorhersage, Sprachen, Speicherstand
src/audio/    erzeugte Klänge
src/input.js  Ziehen, Tippen, Sturmbefehl
src/main.js   Menü, Besprechung, Spielschleife, Einführung
tests/        Regeltests
tools/        Messung, Testspieler, Kartenanzeige
```

Keine Abhängigkeiten, keine Bild-, Modell- oder Tondateien.

## Versionen

Die lokale Versionsverwaltung hält jeden Stand fest. Der Prototyp 0.1 des ersten Entwurfs liegt unter der
Marke `prototyp-0.1`. So wird er als eigener Ordner daneben ausgecheckt, ohne die aktuelle Arbeit zu berühren:

```bash
git worktree add "../HexWars Diorama 0.1" prototyp-0.1
```

## Stand

Stand 0.3 vom 18.11.2026. Geprüft mit Regeltests, Messläufen und Durchläufen im Browser am PC und im
Handy-Format. Nicht geprüft: ein Mensch am Spiel, echtes Handy, Ton, Safari.
