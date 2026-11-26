# Plan · Figurenpool: Ungeheuer und Helden

Stand 19.11.2026 · Spielstand 0.8 · Punkte 13 bis 16 der [Roadmap](ROADMAP.md)

## Worum es geht

Zuerst entsteht ein **Pool von Figuren**: Ungeheuer und Helden, jede mit Modell, Bewegung, Angriff und
Fähigkeit. Jede lässt sich einzeln in einer Figurenschau ansehen. **Wo und wie sie im Spiel vorkommen, ist
bewusst noch offen** und wird erst entschieden, wenn mehrere Figuren fertig sind.

Eine Idee dafür (nicht beschlossen): ein Abenteuer-Verlauf, in dem man in einer Mission eine Figur aus den
Händen von Ungeheuern rettet, die dann ab der nächsten Mission mitkommt. Daraus lassen sich ganz verschiedene
Szenarien bauen.

Bis zu dieser Entscheidung ändert sich am normalen Spiel nichts.

## Leitlinien

1. **Eine Figur nach der anderen.** Jede wird gebaut, getestet, in der Figurenschau gezeigt und von dir
   angesehen, bevor die nächste beginnt.
2. **Jede Figur arbeitet mit dem, was das Spiel schon hat:** Felder, Kanten, eine Truppenzahl pro Feld.
3. **Jede Figur bringt genau einen neuen Baustein mit**, den spätere Figuren wiederverwenden.
4. **Nichts ohne Vorwarnung.** Jeder Angriff ist vorher sichtbar angekündigt (Zeit bis zum Angriff, markiertes
   Ziel). Das muss auch am Handy lesbar sein.
5. **Die Vorhersage bleibt ehrlich.** Was der Pfeil sagt, muss auch mit Figuren genau so eintreten. Dafür gibt
   es zu jeder Figur Tests.
6. **Bestehendes bleibt gleich.** Partien ohne Figuren laufen mit demselben Würfel genau wie vorher. Ein Test
   prüft das.

## Schritt 0 · Figurenschau und Grundlage

**Figurenschau:** eine kleine Testinsel, nur über einen eigenen Link erreichbar, nicht über das Menü.
- Eine Figur wählen und auf die Insel setzen, Truppen eines Reichs daneben stellen.
- Zeit laufen lassen, anhalten, verlangsamen.
- Die Werte der Figur sehen: Stärke, wie oft sie angreift, wie weit sie reicht, was sie gerade vorhat.

**Grundlage „Wildnis“:** Ungeheuer gehören keinem Reich. Sie greifen jeden an, und jeder kann sie angreifen.
Sie können die Partie weder gewinnen noch verlieren. Ihre Trupps kämpfen nach denselben Kantenregeln wie
Soldaten. Eigene Farbe (Vorschlag: Violett) für Zahl, Rand und Figuren. Kampfanzeige, Seitenleisten und
Statistik kommen damit zurecht.

**Fertig, wenn** man in der Figurenschau Truppen setzen und die Zeit steuern kann, und alle bisherigen Karten
mit demselben Würfel genau so laufen wie vorher. Aufwand: mittel.

**Erledigt am 19.11.2026:** Link `?schau` an die Spieladresse hängen. Es gibt noch keine echte Figur; gesetzt
werden vorerst schlichte Trupps der Wildnis (violett, mit Fell und Ohren). Die Werte „Angriff“ und „Reichweite“
bleiben leer, bis eine Figur sie hat. Einzelheiten in Abschnitt 16 von [REWORK-PLAN.md](REWORK-PLAN.md).

## Die Top 10

Reihenfolge nach Empfehlung: vorne die Figuren, die Grundlagen legen und am leichtesten zu lesen sind.

| Nr. | Figur | Art | Neuer Baustein | Aufwand |
|---|---|---|---|---|
| 1 | Troll | Ungeheuer | Ungeheuer greifen aus ihrem Lager an | klein bis mittel |
| 2 | Steinriese | Ungeheuer | schmale Kanten und ein Schlag, der alle Kanten trifft | mittel |
| 3 | Wolfsrudel | Ungeheuer | Ungeheuer, die umherziehen | mittel |
| 4 | Drache | Ungeheuer | Angriff aus der Ferne mit Vorwarnung | mittel |
| 5 | Ritter | Held | Helden: eine Figur, die mit einem Trupp zieht | mittel bis groß |
| 6 | Riesenspinne | Ungeheuer | gesperrte Kanten, die Wege verändern | klein bis mittel |
| 7 | Totenbeschwörer | Ungeheuer | Gefallene werden zu neuen Trupps | mittel bis groß |
| 8 | Greif | Ungeheuer | Angriffe auf Truppen unterwegs | mittel |
| 9 | Magierin | Heldin | Fähigkeit auf Knopfdruck mit Wartezeit | mittel bis groß |
| 10 | Krake | Ungeheuer | Angriffe vom Meer auf Küstenfelder | klein bis mittel |

Aufwand ist geschätzt, nicht gemessen. Alle Zahlen unten sind Startwerte, die in der Figurenschau und später
mit Messläufen eingestellt werden.

### 1 · Troll

- **Fähigkeit:** sitzt in einer Höhle (Startwert: 30 Trolle, wächst nach) und schlägt in festen Abständen mit
  einem Trupp auf das schwächste Nachbarfeld ein (Startwert: alle 50 s, 8 Trolle).
- **Vorwarnung:** Zeit bis zum Überfall über der Höhle, das Ziel kurz vorher markiert.
- **Gegenmittel:** Grenzfelder stark halten, oder die Höhle von mehreren Seiten nehmen.
- **Im Bild:** große, graugrüne Gestalten mit Keule, Feuer vor dem Höhleneingang.

**Gebaut am 19.11.2026**, vorerst nur in der Figurenschau (Werkzeug „Troll“). Entschieden beim Bauen: Trolle
überfallen nur Felder eines Reichs, nie freies Land; wird die Höhle angegriffen, bleiben alle daheim; ein von
Trollen erobertes Feld wächst nicht und überfällt niemanden; nimmt ein Reich die Höhle, bleibt sie als leere
Höhle stehen. Einzelheiten in Abschnitt 17 von [REWORK-PLAN.md](REWORK-PLAN.md).

### 2 · Steinriese

- **Fähigkeit:** sehr stark (Startwert: 60) und ortsfest. An seinen Kanten kämpfen nur 3 Angreifer statt 8.
  Sein Stampfen trifft alle Angreifer an allen Kanten zugleich. Wird er von weniger als 4 Seiten angegriffen,
  heilt er.
- **Vorwarnung:** Er hebt den Fuß, bevor er stampft.
- **Gegenmittel:** rundum einkreisen. Von zwei Seiten ist er nicht zu fällen, von fünf oder sechs schon.
- **Im Bild:** ein Steinriese, etwa dreimal so groß wie ein Soldat.
- **Nebenbei:** Die schmale Kante taugt später auch für Brücken und Furten.

**Gebaut am 25.11.2026**, vorerst nur in der Figurenschau (Werkzeug „Riese“) und nur im Echtzeitspiel.
Entschieden beim Bauen: Er schlägt zurück wie 8 Verteidiger, egal wie stark er ist. Er stampft alle 5 s und
nimmt dabei jedem Angreifer an jeder Kante 6; 1,5 s vorher hebt er den Fuß. Er heilt 5 pro Sekunde, solange
weniger als 4 Seiten angreifen. Fällt er, steht danach nichts mehr von ihm auf dem Feld. Werte in `src/sim/rules.js`
(`giant`), Prüfungen in `tests/giant.test.mjs`. Dein Urteil am 26.11.2026: bleibt so.

### 3 · Wolfsrudel

- **Fähigkeit:** zieht über freies Land von Feld zu Feld und fällt Felder mit wenig Truppen an. Vor starken
  Feldern weicht es aus.
- **Vorwarnung:** Man sieht, wohin das Rudel als Nächstes zieht.
- **Gegenmittel:** keine fast leeren Felder liegen lassen.
- **Im Bild:** ein Rudel grauer Wölfe, das sichtbar über die Karte läuft.

### 4 · Drache

- **Fähigkeit:** schläft in seinem Hort. In festen Abständen (Startwert: 75 s) erwacht er, fliegt zum Feld mit
  den meisten Truppen (egal welches Reich) und verbrennt die Hälfte davon.
- **Vorwarnung:** 10 Sekunden vorher „Drache erwacht“, das Ziel ist markiert.
- **Gegenmittel:** Truppen verteilen. Das wirkt nebenbei gegen das Stapeln, das gegen langsame Gegner noch
  gewinnt.
- **Im Bild:** Drache mit Flügeln, der über die Karte fliegt, Feuer auf dem Zielfeld, verbranntes Gras danach.

### 5 · Ritter (Held)

- **Fähigkeit:** eine einzelne Figur, die mit einem Trupp mitzieht. Wo er kämpft, kämpfen 12 statt 8 Angreifer
  an der Kante, und sein Feld hält länger stand.
- **Gefangennahme:** Fällt sein Feld, wird er gefangen und kann befreit werden. Das ist die Figur für die Idee
  „retten, dann kommt sie mit“.
- **Im Bild:** größer als ein Soldat, mit Umhang und Wappen in der Farbe seines Reichs.
- **Offen:** wie man ihn bewegt (mit einem Trupp schicken oder eigens antippen). Das klären wir in der
  Figurenschau.
- **Idee vom 19.11.2026:** Man verwandelt Truppen in einen Ritter, zum Beispiel 15 Truppen eines Feldes zu
  einem Ritter, und je Reich gibt es nur einen zur selben Zeit („1/1“). Später ginge das ähnlich für andere
  Figuren, etwa einen Totenbeschwörer. Noch nicht entschieden.

### 6 · Riesenspinne

- **Fähigkeit:** spannt Netze über Kanten in ihrer Nähe. Über eine Kante mit Netz kommt niemand, bis das Netz
  durchgekämpft ist.
- **Vorwarnung:** Netze sind im Bild zu sehen, der Pfeil zeigt den Umweg.
- **Gegenmittel:** Umweg nehmen oder das Netz gezielt angreifen.
- **Im Bild:** große Spinne, weiße Netze zwischen den Feldern.

### 7 · Totenbeschwörer

- **Fähigkeit:** Wo in seiner Nähe Truppen fallen, stehen ein Teil davon als Skelette wieder auf und kämpfen
  für ihn.
- **Vorwarnung:** Sein Umkreis ist sichtbar.
- **Gegenmittel:** in seiner Nähe nicht lange kämpfen, oder ihn zuerst ausschalten.
- **Im Bild:** Gestalt in Kutte mit grünem Licht, Skelette, die aus dem Boden steigen.

### 8 · Greif

- **Fähigkeit:** stößt auf Truppen herab, die gerade marschieren, und reißt einen Teil heraus.
- **Vorwarnung:** Er kreist über einem Gebiet, bevor er zustößt.
- **Gegenmittel:** kurze Wege, keine langen Märsche durch sein Gebiet.
- **Im Bild:** halb Adler, halb Löwe, kreist und stößt herab.

### 9 · Magierin (Heldin)

- **Fähigkeit:** eine Fähigkeit, die du per Knopf auslöst, mit Wartezeit danach. Zum Beispiel ein Schutzschild
  für ein Feld oder ein Feuerball.
- **Warum spät:** Das ist der größte Eingriff in die Bedienung, mit einem neuen Knopf und einer Wartezeit.
- **Im Bild:** Gewand mit leuchtendem Stab, sichtbarer Schild oder Feuerball.

### 10 · Krake

- **Fähigkeit:** greift aus dem Meer Küstenfelder an und zieht Truppen ins Wasser.
- **Vorwarnung:** Fangarme tauchen vorher auf.
- **Gegenmittel:** Türme an der Küste, wenig Truppen direkt am Wasser.
- **Warum zuletzt:** Lohnt sich erst, wenn die Küste in Szenarien eine Rolle spielt.

## So entsteht jede Figur

1. Modell, Bewegung und Angriff bauen.
2. Tests: Die Vorhersage stimmt auch mit der Figur, ihre Ankündigung kommt immer vor dem Angriff, Partien ohne
   sie laufen unverändert.
3. In der Figurenschau zeigen, im PC- und im Handy-Format geprüft.
4. Du schaust sie dir an und entscheidest, ob sie so bleibt, geändert wird oder rausfliegt.

Messläufe mit den Testspielern (60 Partien, 3, 5 und 8 Sekunden pro Befehl, Stapel-Bot) gibt es erst, wenn
eine Figur in einem Szenario vorkommt. In der Figurenschau allein gibt es nichts zu gewinnen.

## Später, ebenfalls noch offen

- **Figuren nach Ort (nur Darstellung, keine neuen Regeln):** Bogenschützen am Turm, Ritter in der Burg,
  Bauern am Hof, Rammbock beim Burgsturm ab drei Seiten. Empfehlung: Figurentypen zeigen nur, was die Regeln
  ohnehin tun, und bekommen keine eigenen Werte. Das Spiel lebt von einer Zahl pro Feld.
- **Völker, die eine Regel brechen:** zum Beispiel Nomaden (Abschneiden wirkt nicht), Horde (12 Angreifer pro
  Kante), Clans (wer ihre Burg nimmt, erbt nicht das Reich), Seeräuber (landen an Küstenfeldern). Empfehlung:
  zuerst nur als Gegner.
- **Szenarien und Missionen:** wo welche Figur vorkommt, ob mit Rettung und mitreisenden Helden. Wird
  entschieden, wenn mehrere Figuren fertig sind.
- Aus der alten Planung: Brücken und Furten (nutzen die schmale Kante des Steinriesen), Verbündeter, Nebel,
  Gegner mit Charakter.
