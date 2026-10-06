# Livery Lab per Le Mans Ultimate

Editor di livree per **Le Mans Ultimate** che gira nel browser. Pensato per chi è creativo ma non vuole usare Photoshop o GIMP.

> Progetto amatoriale, non ufficiale. Non è affiliato a Studio 397 o Motorsport Games.

## Cosa fa

- **Apre il template PSD ufficiale** dell'auto (anche trascinandolo sulla tela): prende da solo il wireframe UVW, il colore base, gli adesivi obbligatori (bloccati al loro posto) e la mappa dei materiali. Carrozzeria, carbonio e plastiche del template restano sotto i tuoi livelli, numeri e adesivi sopra.
- **Set di adesivi:** se il template ha più versioni (per esempio WEC e Le Mans 24h) scegli quale usare con un clic. I gruppi del PSD restano gruppi nel pannello Livelli, apribili e nascondibili.
- **Guide del template** come la maschera "Disable for export" e la posizione dei display: si vedono nell'editor ma non finiscono nei file.
- **Riempi pezzo (F) e riempi pannello (M):** un clic e il colore segue la forma esatta della parte della carrozzeria.
- **Forme e disegno:** lame a punti (P), lazo (Q), pennello (B), gomma (E), rettangoli, ellissi, testi e loghi.
- **Maniglie sulla tela** per ruotare e ridimensionare.
- **Trame e sfumature:** carbonio, righe, esagoni, mezzitoni, chevron, scacchi, mimetico, sfumatura a 2 colori e camaleonte a 3 colori.
- **Testi con contorno e ombra**, per numeri di gara e nomi pilota.
- **Specchio sull'altro fianco**, con colore invertito, e **filetto** lungo i bordi.
- **Materiali:** anche la base ha un materiale (per esempio tutta la carrozzeria in cromo o wrap); ogni livello può diventare vernice, carbonio, cromo, wrap o adesivi, così i dettagli possono tornare vernice (region nero).
- **Libreria personale** di loghi e **palette estratta da una foto**.
- **Contagocce** (K, o Alt+clic), **colori recenti**, **colori della livrea** in Libreria e codici **hex** accanto a ogni colore.
- **Effetti dei loghi:** ricolora in tinta unica, contorno e ombra.
- **Ricerca nei livelli**, “Solo i miei” e **anteprima come in gioco** (G).
- **Contorno di pezzi e pannelli** (dentro, a cavallo o fuori dal bordo) e forme con contorno o vuote.
- **Trasforma** loghi e testi: sposta, ruota, ingrandisci, stira in larghezza o altezza, rifletti; valori precisi nelle proprietà.
- **Strumenti alla GIMP, semplificati:** ritaglia sul livello sotto (maschera), modi di fusione, sfocatura dei bordi, luminosità/contrasto/saturazione/tonalità dei loghi.
- **Salvataggio automatico** nel browser e progetti salvabili in JSON.
- **Export per LMU:** `customskin.tga` e `customskin_region.tga` (TGA 32 bit non compressi, 4096 × 4096).

## Come si usa

Apri `index.html` in **Chrome o Edge**, oppure usa la versione pubblicata su GitHub Pages.

Con Chrome o Edge puoi collegare la cartella di gioco (`steamapps/common/Le Mans Ultimate`):

- **Template dal gioco** mostra i PSD di `Support/LiveryTemplates`.
- **Esporta nel gioco** scrive i due TGA in `UserData/Liveries`.
- **Aggiorna il gioco da solo** (nel pannello Documento) riscrive i file qualche secondo dopo ogni modifica.

Per vedere la livrea sull'auto: in LMU vai nello showroom ("Apply to a New Car") e premi **RELOAD** dopo ogni export.

Con altri browser l'editor funziona lo stesso, ma esporta uno zip con i due file da copiare a mano.

## Aggiornamenti

Il numero di versione in alto apre **Novità e aggiornamenti**. L'app controlla a ogni avvio e ogni ora il file `version.json` di questo repository: se c'è una versione nuova, il pulsante diventa **Aggiorna**. Aperta come file in Chrome o Edge, sostituisce `index.html` con un clic (la prima volta chiede quale file); dalla versione pubblicata basta ricaricare. Il lavoro resta salvato nel browser.

Per pubblicare una versione: aggiorna `APP_VERSION` e `CHANGELOG` in `index.html`, poi `sh release.sh <versione> "nota" …` riscrive `version.json` con lo SHA-256 di `index.html`. I due file vanno committati insieme.

## Cosa non c'è nel repository

I template, i modelli e i loghi delle auto appartengono ai rispettivi proprietari e **non sono inclusi**: li trovi nella cartella di installazione del gioco.

## Limiti noti

- Il riconoscimento dei pannelli si basa sulle linee verdi del wireframe UVW. Se il wireframe non ha linee verdi dei pannelli (BMW M Hybrid) o è tutto verde (Ferrari 499P), “Riempi pannello” colora il pezzo intero. Provato sui template di Genesis, Ferrari 296 GT3, Lamborghini Huracán, Porsche 911 GT3 R, BMW M Hybrid, Cadillac V-Series, Ferrari 499P e Oreca 07.
- Non c'è un'anteprima 3D: i modelli delle auto non sono accessibili. Si usa lo showroom del gioco.

## Licenza

MIT, vedi `LICENSE`.
