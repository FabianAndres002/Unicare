package it.unicare.comune;

import com.zaxxer.hikari.HikariDataSource;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Path;

/**
 * Database PostgreSQL "integrato" per lo sviluppo: parte insieme al backend,
 * senza installare PostgreSQL né Docker.
 *
 * - Attivo quando unicare.database-integrato=true (predefinito in sviluppo).
 * - I dati restano nella cartella indicata da unicare.database-integrato.cartella
 *   (predefinito: backend/.database-locale), quindi sopravvivono ai riavvii.
 * - In produzione si mette unicare.database-integrato=false e si usa un PostgreSQL vero
 *   tramite DB_URL, DB_USER e DB_PASSWORD.
 */
@Configuration
@ConditionalOnProperty(name = "unicare.database-integrato.attivo", havingValue = "true")
public class DatabaseIntegratoConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseIntegratoConfig.class);

    @Bean(destroyMethod = "close")
    EmbeddedPostgres postgresIntegrato(
            @Value("${unicare.database-integrato.cartella}") String cartella,
            @Value("${unicare.database-integrato.porta}") int porta,
            @Value("${unicare.database-integrato.svuota-all-avvio:false}") boolean svuota) throws IOException {
        EmbeddedPostgres pg = EmbeddedPostgres.builder()
                .setDataDirectory(Path.of(cartella))
                .setCleanDataDirectory(svuota)
                .setPort(porta) // 0 = porta libera scelta a caso (usato nei test)
                .start();
        log.info("Database integrato avviato: {} (dati in {})",
                pg.getJdbcUrl("postgres", "postgres"), Path.of(cartella).toAbsolutePath());
        return pg;
    }

    @Bean
    DataSource dataSource(EmbeddedPostgres pg) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(pg.getJdbcUrl("postgres", "postgres"));
        ds.setUsername("postgres");
        ds.setMaximumPoolSize(5);
        return ds;
    }
}
