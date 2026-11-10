package it.unicare.comune;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint di prova della settimana 1: il frontend lo chiama per verificare
 * che backend e database siano raggiungibili.
 *
 * GET /api/stato  ->  {"app":"Unicare","database":"ok","tabelle":7}
 */
@RestController
@RequestMapping("/api")
public class StatoController {

    private final JdbcTemplate jdbc;

    // Spring passa il JdbcTemplate nel costruttore (dependency injection).
    public StatoController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/stato")
    public StatoRisposta stato() {
        // Conta le tabelle create da Flyway: se la query funziona, il database risponde.
        Integer tabelle = jdbc.queryForObject("""
                SELECT count(*) FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name <> 'flyway_schema_history'
                """, Integer.class);
        return new StatoRisposta("Unicare", "ok", tabelle == null ? 0 : tabelle);
    }

    /** Un record Java diventa automaticamente un oggetto JSON. */
    public record StatoRisposta(String app, String database, int tabelle) {
    }
}
