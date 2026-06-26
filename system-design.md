# Current Todos

Was muss alles bis zur nächsten Woche (30.6.) gemacht werden.

## Speed up process

Consists of two parts:
- Speed up The communication to the chain so the rider does not have to wait for the block creation at the turnstile (maybe with caching, maybe with just reading the chain before writing, and writing after the rider has passed)
- Remove MetaMask as much as possible from the Start/Stop Trip process
- Simulate transaction before opening meta mask

## Improve deployment pipeline
Public GitHub repo erstellen und history squashen, sodass private data nicht geleakt wird.

Push auf main deaktivieren, sodass nur über ein MR in production deployt werden kann.

Push triggers pdf generation as artifact. (probably not only main and instead also feature branches with an name suffix, so the current versions can be looked at) 
Show current artifacts in GitHub UI

Vielleicht auch nur auf GitHub arbeiten und nicht mehr auf GitLab.

Pdf creation in Pipeline aufnehmen => Gute Artefact overview in GitHub
## Little Improvements
- display contract adress in frontend (vielleicht sogar mit einem Link zu Etherscan), praktisch zum debuggen
- Get Ethtocredits rate from Chain and not anymore hardcoded in frontend
- im Operator Dashboard die aktuell offenen Trips einsehen (nur die Walletadressen), praktisch zum debuggen


# Caching (Todo) - evtl. nicht relevant, wenn es reicht die Chain zu querienj
- vor erster Fahrt muss Rider sich im Cache registrieren (Annahme: wird bei Ausstellung des NFC automatisch erledigt)
- TicketScanner/QR-Code Scanner müssen autonom entscheiden können, ob ein Rider einsteigen darf
- Server des Operators speichert Credit Balances der Rider und hält sich per startTrip-Events aktuell (minimiert Chain-Zugriffe im Vergleich zu Abfrage aller Balances)
- Wenn ein User rejected wird, wird dieser User direkt gequerried, sodass es beim darauffolgenden Scan funktionieren könnte

Es gibt auch einen 2. Cache in die *andere Richtung*, wo die Signaturen der Rider gestored werden.
Diese werden dann nach und nach auf die Chain geschrieben.

Der Operator hat die Möglichkeit seine Gates nicht direkt mit der Chain sprechen zu lassen, sondern über ein zentrales Backend. Dieses Backend stellt MoveChain aber nicht bereit.

Probleme:
- Skalierbarkeit, was ist wenn der Bus Millionen von Ridern cachen muss? -> stand jetzt Problem des Operators, aber sollten daran arbeiten, den Zugriff schnell zu machen, ohne dass Cache nötig ist

## Flow
1. Rider meldet Trip an -> per Cache prüfen, ob genug Credits und Credits im Cache reduzieren (im Zweifel werden zu viele Credits im Cache abgezogen -> Fallback: wenn zu wenig Credits laut Cache erst bis Chain-Zugriff warten und dann erst offiziell sagen, dass Buchung nicht möglich)
2. Operator startet Trip -> Event emitten, um Balance im Cache abzugleichen (Drift)

# Annahmen
- Jede Fahrt bei einem Operator hat den gleichen Preis unabhängig von der Länge der Strecke/Zeit
- Es gibt keine Caps ab den es Rabatt für die Rider gibt
- Trips werden immer gestartet und beendet (Drehkreuze überall) => Nur ein Trip pro Rider zur Zeit
- Nur Mehrpersonen Feste Stationen Transport (S-Bahn, Tram, Bus, U-Bahn)
- Kein Mengenrabatt für Rider für große Top-Ups: Simpel für Rider, keine Entscheidung gefordert was der passendste Top Up wär
- Feste Exchange Rate für Rider ETH to TripCredits
- Keine Historie über abgeschlossene Trips (das kann der Operator seperat machen)

# User Stories - Was soll unser System können?
## Start/Stop Trip with QR
1. Rider wählt Operator X im Frontend aus und sieht Trip Preis für diesen Operator
1. Rider unterschreibt, dass er Trip bei Operator X starten/stoppen will (offline) mit Ablaufdatum und zeigt QR-Code dem Operator
1. Operator startet mit Rider Public Wallet ID UND Signatur trip für Rider in dem er Smart Contract Function startTrip(startTrip checks if the Rider has enough TripCredits for the)/completeTrip called (call to Chain via frontend)

## Prepaid top up
- Möglichkeit über Web-Frontend ETH in TripCredit umzuwandeln (fixe Exchange Rate)

## Add/Whitelist Operator
- Admin only
- Add trip price (regardless of trip distance)
- Add name for Operator

# Final Poster Presentation
Wenn wir die Deployment Pipeline nicht in dem ersten Poster erwähnen könnten wir das noch ins final poster nehmen.

# Report
Explizit machen was wir an der User Stories ändern
Relevanz für echte Welt, Grenzen
Andere Etherum Testnets oder custom Hardhat deployment auf nem Server.
AI Usage
Zero Knowledge Proof für Balance Caching
Was würde das System an Gas kosten?
Vergleich wie es schon von Opal z.B. umgesetzt wurde.

In Web2 ist die Pipeline auf schnelles, reversibles Deployment optimiert. Bei Smart Contracts verschiebt sich fast alles nach links – die Pipeline ist auf maximale Absicherung vor einem teuren, irreversiblen Schritt optimiert. CI (Tests, Fuzzing, Static Analysis) ist üppig und streng; CD ist bewusst gebremst, je näher an Mainnet, desto mehr menschliche Gates.

# Cherry on the top Ideen 

## Start/Stop Trip with NFC

For the rider the start and stop becomes just a single tap.

1. Rider taps Gate
1. Rider gets information of Operator
1. Rider signs that he wants to start/stop a trip for the Operator
1. Operator get's the signature and starts the trip for the Rider

## Was ist das beste distributed TestNet?
Eher nicht, aber vielleicht auch beim Rechnen der Gas Costs nochmal relevant oder bei der Robustheit von dem Cache.
