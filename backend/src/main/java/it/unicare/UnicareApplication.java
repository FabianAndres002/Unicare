package it.unicare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Punto di avvio del backend di Unicare.
 * Ogni sottocartella di it.unicare è un modulo (cerchio, richieste, promemoria...).
 */
@SpringBootApplication
public class UnicareApplication {

    public static void main(String[] args) {
        SpringApplication.run(UnicareApplication.class, args);
    }
}
