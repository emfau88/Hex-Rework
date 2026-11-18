# HexWars Diorama · Prototyp „One Crown"

Echtzeit-Strategie auf einer plastischen Hex-Insel: bis zu vier Reiche, eine Krone. Spielregeln aus
HEXFRONT weitergedacht, Aussehen nach den Territory-Wars-Shorts des Endless Battle Simulator.

**Der vollständige Plan steht in [docs/UMSETZUNGSPLAN.md](docs/UMSETZUNGSPLAN.md).**

## Starten

| Wo | Wie |
|---|---|
| PC | `start.bat` doppelklicken. Der Browser öffnet sich von selbst. |
| Handy | `start-handy.bat` doppelklicken. Im Fenster steht eine Adresse wie `http://192.168.x.x:4180/`. Diese im Handy-Browser öffnen (gleiches WLAN). |

Voraussetzung ist Node.js ab Version 20. Es wird nichts installiert und nichts heruntergeladen.
`start-handy.bat` macht den Ordner für Geräte im eigenen WLAN lesbar, solange das Fenster offen ist.

Von Hand:

```bash
node serve.mjs
```

## Bedienung

- **Schicken:** von einem eigenen Feld auf ein Ziel ziehen. Oder erst das Feld, dann das Ziel antippen.
- **Weg:** Truppen laufen durch eigenes Gebiet. Der Pfeil zeigt vorher, ob es reicht (zum Beispiel „9 vs 6").
- **Senden 50 % / 100 %:** Knopf unten links, am PC auch Tasten `1` und `2`.
- **Turm / Hof:** eigenes Feld antippen, dann bauen. Reicht es noch nicht, spart das Feld (goldener Punkt).
- **Nachschub:** schickt Truppen aus dem Hinterland automatisch an die Front.
- **Pause:** Knopf oben links, am PC Leertaste. `Esc` hebt die Auswahl auf.

Wer eine Burg erobert, bekommt das ganze Reich. Fällt die eigene Burg, ist die Partie verloren.
Ab 3:30 beginnt der Sturm: Mauern bröckeln, Angreifer sind im Vorteil.

## Balance prüfen

Computerreiche spielen ganze Partien ohne Browser gegeneinander:

```bash
node tools/simulate.mjs 60
```

```bash
node tools/simulate.mjs 60 --wide
```

Die Ausgabe zeigt je Karte und Stärke: Partiedauer, wann die erste Burg fällt, Siege je Startplatz,
festgefahrene Partien, wie lange ein untätiger Spieler überlebt und wie oft ein starker Spieler gewinnt.
Alle Stellschrauben stehen in `src/sim/rules.js`.

## Aufbau

```
src/sim/      Regeln, Karten, KI (ohne Browser lauffähig)
src/render/   WebGL2-Diorama: Modelle, Licht, Schatten
src/ui/       Zahlen und Pfeile, Sprachen, Speicherstand
src/audio/    erzeugte Klänge
src/main.js   Bildschirme und Spielschleife
```

Keine Abhängigkeiten, keine Bild-, Modell- oder Tondateien.

## Stand

Prototyp 0.1 vom 17.11.2026. Geprüft im Browser am PC in Handy- und Breitbildgröße. Nicht geprüft:
echtes Handy, Ton, Safari. Regeln und Balance sind vorläufig.
