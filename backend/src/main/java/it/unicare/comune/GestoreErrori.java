package it.unicare.comune;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/** Un unico formato per tutti gli errori, così il frontend li mostra sempre allo stesso modo. */
@RestControllerAdvice
public class GestoreErrori {

    public record Errore(String codice, String messaggio) {
    }

    @ExceptionHandler(ErroreApplicativo.class)
    ResponseEntity<Errore> applicativo(ErroreApplicativo e) {
        return ResponseEntity.status(e.getStato()).body(new Errore(e.getCodice(), e.getMessage()));
    }

    /** Dati non validi (@NotBlank, @Email, @Size...): elenca i campi sbagliati. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Errore> validazione(MethodArgumentNotValidException e) {
        String dettagli = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .sorted()
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(new Errore("DATI_NON_VALIDI", dettagli));
    }

    /** JSON malformato o valore sconosciuto (es. tipo "NONNO"). */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Errore> illeggibile(HttpMessageNotReadableException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new Errore("RICHIESTA_ILLEGGIBILE", "Il formato della richiesta non è valido."));
    }
}
