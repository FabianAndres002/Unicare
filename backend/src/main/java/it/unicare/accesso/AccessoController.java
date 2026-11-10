package it.unicare.accesso;

import it.unicare.comune.ErroreApplicativo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Registrazione, login e logout di familiari e badanti.
 * Dopo il login il server ricorda l'utente in una sessione (cookie HttpOnly).
 */
@RestController
@RequestMapping("/api/auth")
public class AccessoController {

    private final AccessoService accesso;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contestoSessione = new HttpSessionSecurityContextRepository();

    public AccessoController(AccessoService accesso, AuthenticationManager authenticationManager) {
        this.accesso = accesso;
        this.authenticationManager = authenticationManager;
    }

    // ---- Dati in ingresso e in uscita (diventano JSON) ----

    public record RichiestaRegistrazione(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72, message = "deve avere almeno 8 caratteri") String password,
            @NotBlank @Size(max = 80) String nome,
            @NotBlank @Size(max = 80) String cognome,
            @NotNull Utente.Tipo tipo) {
    }

    public record RichiestaLogin(@NotBlank String email, @NotBlank String password) {
    }

    public record Profilo(Long id, String email, String nome, Utente.Tipo tipo) {
        static Profilo da(UtenteConnesso u) {
            return new Profilo(u.id(), u.email(), u.nome(), u.tipo());
        }
    }

    // ---- Endpoint ----

    /** Crea l'account e fa subito entrare l'utente. */
    @PostMapping("/registrati")
    @ResponseStatus(HttpStatus.CREATED)
    public Profilo registrati(@Valid @RequestBody RichiestaRegistrazione r,
                              HttpServletRequest req, HttpServletResponse res) {
        accesso.registra(r);
        return entra(r.email().trim(), r.password(), req, res);
    }

    @PostMapping("/login")
    public Profilo login(@Valid @RequestBody RichiestaLogin r,
                         HttpServletRequest req, HttpServletResponse res) {
        return entra(r.email().trim(), r.password(), req, res);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest req, HttpServletResponse res, Authentication auth) {
        new SecurityContextLogoutHandler().logout(req, res, auth);
    }

    /** Chi sono? Il frontend lo chiama all'avvio per sapere se l'utente è già dentro. */
    @GetMapping("/io")
    public Profilo io(@AuthenticationPrincipal UtenteConnesso utente) {
        return Profilo.da(utente);
    }

    // ---- Supporto ----

    private Profilo entra(String email, String password, HttpServletRequest req, HttpServletResponse res) {
        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, password));
        } catch (AuthenticationException e) {
            // Stesso messaggio se l'email non esiste o la password è sbagliata:
            // così nessuno può scoprire quali email sono registrate.
            throw new ErroreApplicativo(HttpStatus.UNAUTHORIZED, "CREDENZIALI_ERRATE",
                    "Email o password non corretti.");
        }
        // Sessione sempre nuova dopo il login (protegge dal "session fixation").
        HttpSession vecchia = req.getSession(false);
        if (vecchia != null) {
            vecchia.invalidate();
        }
        req.getSession(true);
        SecurityContext contesto = SecurityContextHolder.createEmptyContext();
        contesto.setAuthentication(auth);
        SecurityContextHolder.setContext(contesto);
        contestoSessione.saveContext(contesto, req, res);
        return Profilo.da((UtenteConnesso) auth.getPrincipal());
    }
}
