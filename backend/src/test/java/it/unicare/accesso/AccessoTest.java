package it.unicare.accesso;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test di registrazione, login e logout.
 * Ogni test gira in una transazione annullata alla fine: il database resta pulito.
 * Richiede PostgreSQL avviato (docker compose up -d).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AccessoTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    UtenteRepository utenti;

    private static final String LUCIA = """
            {"email":"lucia@esempio.it","password":"password-sicura","nome":"Lucia",
             "cognome":"Rossi","tipo":"FAMILIARE"}
            """;

    private MockHttpSession registraLucia() throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/auth/registrati").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(LUCIA))
                .andExpect(status().isCreated())
                .andReturn().getRequest().getSession();
    }

    @Test
    void laRegistrazioneCreaLUtenteEFaEntrare() throws Exception {
        MockHttpSession sessione = registraLucia();

        mvc.perform(get("/api/auth/io").session(sessione))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Lucia"))
                .andExpect(jsonPath("$.tipo").value("FAMILIARE"));
    }

    @Test
    void laPasswordNonVieneSalvataInChiaro() throws Exception {
        registraLucia();

        Utente lucia = utenti.cercaPerEmail("lucia@esempio.it").orElseThrow();
        assertThat(lucia.getPasswordHash()).isNotEqualTo("password-sicura").startsWith("$2");
    }

    @Test
    void unaSecondaRegistrazioneConLaStessaEmailVieneRifiutata() throws Exception {
        registraLucia();

        mvc.perform(post("/api/auth/registrati").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUCIA.replace("lucia@esempio.it", "LUCIA@Esempio.it")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codice").value("EMAIL_GIA_USATA"));
    }

    @Test
    void unaPasswordCortaVieneRifiutata() throws Exception {
        mvc.perform(post("/api/auth/registrati").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUCIA.replace("password-sicura", "corta")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codice").value("DATI_NON_VALIDI"));
    }

    @Test
    void ilLoginFunzionaConLaPasswordGiusta() throws Exception {
        registraLucia();

        MockHttpSession sessione = (MockHttpSession) mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"lucia@esempio.it\",\"password\":\"password-sicura\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("lucia@esempio.it"))
                .andReturn().getRequest().getSession();

        mvc.perform(get("/api/auth/io").session(sessione)).andExpect(status().isOk());
    }

    @Test
    void passwordSbagliataEdEmailInesistenteDannoLoStessoErrore() throws Exception {
        registraLucia();

        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"lucia@esempio.it\",\"password\":\"sbagliata\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codice").value("CREDENZIALI_ERRATE"));

        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nessuno@esempio.it\",\"password\":\"qualsiasi\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codice").value("CREDENZIALI_ERRATE"));
    }

    @Test
    void senzaLoginLeApiProtetteRispondono401() throws Exception {
        mvc.perform(get("/api/auth/io"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codice").value("NON_AUTENTICATO"));
    }

    @Test
    void dopoIlLogoutLaSessioneNonValePiu() throws Exception {
        MockHttpSession sessione = registraLucia();

        mvc.perform(post("/api/auth/logout").with(csrf()).session(sessione))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/auth/io").session(sessione)).andExpect(status().isUnauthorized());
    }

    @Test
    void senzaTokenCsrfLaRichiestaVieneBloccata() throws Exception {
        mvc.perform(post("/api/auth/registrati")
                        .contentType(MediaType.APPLICATION_JSON).content(LUCIA))
                .andExpect(status().isForbidden());
    }
}
