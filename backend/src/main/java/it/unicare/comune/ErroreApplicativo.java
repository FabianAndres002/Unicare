package it.unicare.comune;

import org.springframework.http.HttpStatus;

/**
 * Errore previsto dall'applicazione (email già usata, credenziali errate...).
 * GestoreErrori lo trasforma in una risposta JSON {"codice": ..., "messaggio": ...}.
 */
public class ErroreApplicativo extends RuntimeException {

    private final HttpStatus stato;
    private final String codice;

    public ErroreApplicativo(HttpStatus stato, String codice, String messaggio) {
        super(messaggio);
        this.stato = stato;
        this.codice = codice;
    }

    public HttpStatus getStato() { return stato; }
    public String getCodice() { return codice; }
}
