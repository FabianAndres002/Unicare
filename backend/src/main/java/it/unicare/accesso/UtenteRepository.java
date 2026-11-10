package it.unicare.accesso;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

/** Spring Data genera da solo il codice SQL di questi metodi. */
public interface UtenteRepository extends JpaRepository<Utente, Long> {

    // L'email è unica senza distinguere maiuscole e minuscole (indice lower(email) nella V1).
    @Query("SELECT u FROM Utente u WHERE lower(u.email) = lower(:email)")
    Optional<Utente> cercaPerEmail(String email);

    @Query("SELECT count(u) > 0 FROM Utente u WHERE lower(u.email) = lower(:email)")
    boolean emailGiaUsata(String email);
}
