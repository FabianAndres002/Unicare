package it.unicare.accesso;

import it.unicare.comune.ErroreApplicativo;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Registrazione degli utenti e lettura per il login. */
@Service
public class AccessoService implements UserDetailsService {

    private final UtenteRepository utenti;
    private final PasswordEncoder passwordEncoder;

    public AccessoService(UtenteRepository utenti, PasswordEncoder passwordEncoder) {
        this.utenti = utenti;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UtenteConnesso registra(AccessoController.RichiestaRegistrazione r) {
        String email = r.email().trim();
        if (utenti.emailGiaUsata(email)) {
            throw new ErroreApplicativo(HttpStatus.CONFLICT, "EMAIL_GIA_USATA",
                    "Esiste già un account con questa email.");
        }
        // La password non si salva mai: solo il suo hash BCrypt.
        Utente nuovo = new Utente(email, passwordEncoder.encode(r.password()),
                r.nome().trim(), r.cognome().trim(), r.tipo());
        return UtenteConnesso.da(utenti.save(nuovo));
    }

    /** Usato da Spring Security durante il login. */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        return utenti.cercaPerEmail(email)
                .map(UtenteConnesso::da)
                .orElseThrow(() -> new UsernameNotFoundException("Utente non trovato"));
    }
}
