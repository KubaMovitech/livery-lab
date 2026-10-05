# Livery Lab per Le Mans Ultimate

Editor di livree per **Le Mans Ultimate** che gira nel browser. Pensato per chi è creativo ma non vuole usare Photoshop o GIMP.

> Progetto amatoriale, non ufficiale. Non è affiliato a Studio 397 o Motorsport Games.

## Cosa fa

- **Apre il template PSD ufficiale** dell'auto: prende da solo il wireframe UVW, il colore base, gli adesivi obbligatori (bloccati al loro posto) e la mappa dei materiali.
- **Riempi pezzo (F) e riempi pannello (M):** un clic e il colore segue la forma esatta della parte della carrozzeria.
- **Forme e disegno:** lame a punti (P), lazo (Q), pennello (B), gomma (E), rettangoli, ellissi, testi e loghi.
- **Maniglie sulla tela** per ruotare e ridimensionare.
- **Trame e sfumature:** carbonio, righe, esagoni, mezzitoni, chevron, scacchi, mimetico, sfumatura a 2 colori e camaleonte a 3 colori.
- **Testi con contorno e ombra**, per numeri di gara e nomi pilota.
- **Specchio sull'altro fianco**, con colore invertito, e **filetto** lungo i bordi.
- **Materiali:** ogni livello può diventare vernice, carbonio, cromo, wrap o adesivi, e finisce nella mappa delle regioni.
- **Libreria personale** di loghi e **palette estratta da una foto**.
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

## Cosa non c'è nel repository

I template, i modelli e i loghi delle auto appartengono ai rispettivi proprietari e **non sono inclusi**: li trovi nella cartella di installazione del gioco.

## Limiti noti

- Il riconoscimento dei pannelli si basa sulle linee verdi del wireframe UVW. È stato provato sul template della Genesis.
- Non c'è un'anteprima 3D: i modelli delle auto non sono accessibili. Si usa lo showroom del gioco.

## Licenza

MIT, vedi `LICENSE`.
