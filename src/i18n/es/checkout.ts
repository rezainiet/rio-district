/** Spanish entries for the checkout area, keyed by the exact French text. */
const es: Record<string, string> = {
  /* ---------- Cart drawer, cart page, cart lines, summary ---------- */
  "{name} · taille {size}": "{name} · talla {size}",
  "Veste": "Chaqueta",
  "Ton panier": "Tu carrito",
  "Fermer le panier": "Cerrar el carrito",
  "Continuer mes achats": "Seguir comprando",
  "Ton panier est vide.": "Tu carrito está vacío.",
  "Six coloris, du XS au 3XL — et {price} les deux.": "Seis colores, de la XS a la 3XL — y {price} las dos.",
  "Six coloris, du XS au 3XL.": "Seis colores, de la XS a la 3XL.",
  "Voir les vestes": "Ver las chaquetas",
  "Une 2e veste pour {price} de plus": "Una 2.ª chaqueta por {price} más",
  "{label} : {price} les deux, coloris au choix": "{label}: {price} las dos, colores a elegir",
  "Livrée {date} pour une commande aujourd'hui": "Entrega {date} si pides hoy",
  "Commander · {total}": "Hacer el pedido · {total}",
  "Paiement chez notre partenaire externe": "Pago con nuestro proveedor de pagos externo",
  "Demande de commande · rien à payer aujourd’hui": "Solicitud de pedido · hoy no pagas nada",
  "panier détaillé": "carrito detallado",
  "Corrige les articles signalés pour continuer.": "Corrige los artículos señalados para continuar.",
  "Indisponible": "No disponible",
  "{size} — épuisé": "{size} — agotada",
  "Article": "Artículo",
  "Article indisponible": "Artículo no disponible",
  "Tu économises {amount}": "Ahorras {amount}",
  "Quantité": "Cantidad",
  "Diminuer la quantité": "Reducir la cantidad",
  "Augmenter la quantité": "Aumentar la cantidad",
  "Retirer": "Quitar",
  "Chargement du panier": "Cargando el carrito",
  "Choisis ta couleur — ou deux, c'est {price} le pack.": "Elige tu color — o dos: {price} el pack.",
  "Récapitulatif": "Resumen",
  "Certains articles ne sont plus disponibles : modifie-les ou retire-les.": "Algunos artículos ya no están disponibles: cámbialos o quítalos.",
  "Coordonnées ici, puis paiement chez notre partenaire externe": "Tus datos aquí y, después, el pago con nuestro proveedor de pagos externo",
  "Rien à payer aujourd’hui : commande confirmée par e-mail": "Hoy no pagas nada: confirmamos el pedido por correo electrónico",
  "Sous-total ({n} article)": "Subtotal ({n} artículo)",
  "Sous-total ({n} articles)": "Subtotal ({n} artículos)",
  "Sous-total": "Subtotal",
  "Remise pack": "Descuento pack",
  "Offerte": "Gratis",
  "Total TTC": "Total IVA incluido",
  "Panier": "Carrito",

  /* ---------- Checkout ---------- */
  "Sélection indisponible": "Selección no disponible",
  "Choisis à nouveau ta couleur et ta taille pour continuer.": "Vuelve a elegir tu color y tu talla para continuar.",
  "Voir la collection": "Ver la colección",
  "Facultatif": "Opcional",
  "Modifier la sélection": "Cambiar la selección",
  "Modifier le panier": "Editar el carrito",
  "Ta commande": "Tu pedido",
  "Ta commande · {n} article": "Tu pedido · {n} artículo",
  "Ta commande · {n} articles": "Tu pedido · {n} artículos",
  "Étapes": "Pasos",
  "Sélection": "Selección",
  "Coordonnées": "Datos",
  "Finaliser ma commande": "Finalizar mi pedido",
  "Une commande est déjà en attente. Vérifie son statut avant de lancer un autre paiement.":
    "Ya tienes un pedido pendiente. Comprueba su estado antes de iniciar otro pago.",
  "Retrouver cette commande": "Ver este pedido",
  "01 · Tes coordonnées": "01 · Tus datos",
  "Prénom": "Nombre",
  "Nom": "Apellidos",
  "E-mail": "Correo electrónico",
  "Téléphone": "Teléfono",
  "02 · Livraison": "02 · Envío",
  "Adresse": "Dirección",
  "Numéro et rue": "Calle y número",
  "Code postal": "Código postal",
  "Ville": "Ciudad",
  "Pays": "País",
  "Complément d’adresse ou note": "Piso, puerta o nota",
  "· facultatif": "· opcional",
  "Complément d'adresse": "Piso, puerta, etc.",
  "Bâtiment, étage, digicode…": "Bloque, piso, puerta…",
  "Notes de commande": "Notas del pedido",
  "Une précision pour la livraison ?": "¿Algún detalle para la entrega?",
  "J’accepte que mon identifiant de clic Meta ou Snapchat (s’il existe) soit transmis à notre partenaire de paiement pour le suivi publicitaire. Mon choix est facultatif et n’empêche pas de commander.":
    "Acepto que mi identificador de clic de Meta o Snapchat (si existe) se envíe a nuestro proveedor de pagos para el seguimiento publicitario. Es opcional y no me impide hacer el pedido.",
  "03 · Ta commande": "03 · Tu pedido",
  "Total à régler": "Total a pagar",
  "Vérification des prix impossible pour l'instant : le total définitif sera calculé à l'envoi.":
    "Ahora mismo no podemos verificar los precios: el total definitivo se calculará al enviar el pedido.",
  "Préparation du paiement…": "Preparando el pago…",
  "Continuer vers le paiement ↗": "Continuar al pago ↗",
  "Le paiement est momentanément indisponible.": "El pago no está disponible en este momento.",
  "Mode test · aucun débit possible": "Modo de prueba · no se puede cobrar nada",
  "Paiement sur le site de notre partenaire externe": "Pago en la web de nuestro proveedor de pagos externo",
  "Livraison estimée {date}. Expédition après vérification du paiement.": "Entrega estimada {date}. Enviamos el pedido tras verificar el pago.",

  /* Delivery countries (src/lib/validation.ts COUNTRIES, shown with tx) */
  "France": "Francia",
  "Belgique": "Bélgica",
  "Suisse": "Suiza",
  "Luxembourg": "Luxemburgo",
  "Monaco": "Mónaco",
  "Espagne": "España",

  /* Phone field */
  "Indicatif téléphonique : {country} {dial}. Changer le pays": "Prefijo telefónico: {country} {dial}. Cambiar el país",
  "Rechercher un pays ou un indicatif": "Buscar un país o un prefijo",
  "Rechercher un pays…": "Buscar un país…",
  "Pays du numéro de téléphone": "País del número de teléfono",
  "Aucun pays trouvé.": "No se ha encontrado ningún país.",

  /* Checkout messages set in the browser */
  "Connexion impossible. Vérifie ton réseau puis réessaie : ta demande ne sera pas dupliquée.":
    "No se ha podido conectar. Comprueba tu conexión y vuelve a intentarlo: tu solicitud no se duplicará.",
  "Destination de paiement refusée. Ta commande reste en attente.": "Destino de pago rechazado. Tu pedido sigue pendiente.",
  "Le paiement est momentanément indisponible. Réessaie avec la même commande.":
    "El pago no está disponible en este momento. Vuelve a intentarlo con el mismo pedido.",
  "La réponse n’a pas pu être confirmée. Réessaie avec la même demande.": "No hemos podido confirmar la respuesta. Vuelve a intentarlo con la misma solicitud.",
  "Redirection interrompue. Retrouve ta commande en attente pour réessayer sans la dupliquer.":
    "Redirección interrumpida. Recupera tu pedido pendiente para volver a intentarlo sin duplicarlo.",

  /* Resume payment */
  "Préparation…": "Preparando…",
  "Reprendre le paiement ↗": "Retomar el pago ↗",
  "Relance impossible.": "No se ha podido retomar el pago.",
  "Destination refusée.": "Destino rechazado.",
  "Connexion interrompue. Réessaie sans recréer la commande.": "Conexión interrumpida. Vuelve a intentarlo sin crear el pedido de nuevo.",

  /* ---------- Advertising cookies banner (MarketingPixels) ---------- */
  "Choix des cookies publicitaires": "Elección de cookies publicitarias",
  "Cookies publicitaires": "Cookies publicitarias",
  "Avec ton accord, les pixels Snapchat et Meta mesurent les pages visitées et certaines actions (produit consulté, ajout au panier et début de commande) pour nos campagnes. Si tu arrives d’une publicité Meta ou Snapchat, son identifiant de clic est conservé dans cet onglet et transmis au partenaire de paiement seulement avec ton accord sur le formulaire de commande. Le début de commande est envoyé comme événement InitiateCheckout à Meta ; le clic vers le paiement est envoyé comme START_CHECKOUT à Snapchat. Aucun achat n’est déclaré par la boutique à ce stade. Ils peuvent utiliser des cookies et transmettre des données de navigation à Snap et Meta. Ton choix est facultatif et n’affecte pas ta commande.":
    "Con tu consentimiento, los píxeles de Snapchat y Meta miden las páginas visitadas y algunas acciones (producto visto, añadido al carrito e inicio del pedido) para nuestras campañas. Si llegas desde un anuncio de Meta o Snapchat, su identificador de clic se guarda en esta pestaña y solo se envía al proveedor de pagos si das tu consentimiento en el formulario del pedido. El inicio del pedido se envía a Meta como evento InitiateCheckout; el clic hacia el pago se envía a Snapchat como START_CHECKOUT. Por ahora la tienda no declara ninguna compra. Pueden usar cookies y transmitir datos de navegación a Snap y Meta. Tu elección es opcional y no afecta a tu pedido.",
  "Confidentialité de Snap": "Privacidad de Snap",
  "Confidentialité de Meta": "Privacidad de Meta",
  "Fermer les paramètres des cookies": "Cerrar la configuración de cookies",
  "Refuser": "Rechazar",
  "Accepter": "Aceptar",

  /* ---------- Order confirmation ---------- */
  "Commande enregistrée": "Pedido registrado",
  "Demande n° {number}": "Solicitud n.º {number}",
  "Merci, c'est noté.": "Gracias, ya lo tenemos.",
  "Ta sélection est enregistrée. Cette page ne confirme aucun paiement. Si tu as déjà payé chez le partenaire, contacte la boutique avant de réessayer.":
    "Tu selección se ha registrado. Esta página no confirma ningún pago. Si ya has pagado al proveedor de pagos, contacta con la tienda antes de volver a intentarlo.",
  "Ta demande de commande est bien enregistrée. Nous revenons vers toi à {email} pour la confirmer et t'indiquer comment régler.":
    "Tu solicitud de pedido se ha registrado. Te escribiremos a {email} para confirmarla y explicarte cómo pagar.",
  "Statut": "Estado",
  "En attente de confirmation": "Pendiente de confirmación",
  "Confirmée": "Confirmado",
  "Expédiée": "Enviado",
  "Annulée": "Cancelado",
  "Paiement vérifié": "Pago verificado",
  "Remboursement enregistré": "Reembolso registrado",
  "Échec enregistré": "Fallo registrado",
  "En attente — paiement non vérifié": "Pendiente — pago no verificado",
  "Non payée — aucun montant prélevé": "Sin pagar — no se ha cobrado nada",
  "Et ensuite ?": "¿Y ahora qué?",
  "La boutique rapproche ta commande avec une preuve de paiement vérifiée.": "La tienda cotejará tu pedido con un justificante de pago verificado.",
  "Nous confirmons ta commande par e-mail.": "Te confirmamos el pedido por correo electrónico.",
  "Un retour du partenaire ne constitue pas une confirmation de paiement.": "Una respuesta del proveedor de pagos no es una confirmación de pago.",
  "Tu règles selon les instructions reçues.": "Pagas según las instrucciones recibidas.",
  "Expédition, puis {summary}.": "Expedición y, después, {summary}.",
  "Retour à la boutique": "Volver a la tienda",
  "Conserve cette page : son lien te permet de retrouver ta demande.": "Guarda esta página: con su enlace puedes volver a ver tu solicitud.",

  /* Local payment simulator (mock mode only) */
  "Simulation de paiement": "Simulación de pago",
  "Simulation locale · aucun débit": "Simulación local · sin cobro",
  "Prêt pour le partenaire.": "Listo para el proveedor de pagos.",
  "Le parcours s’arrête ici en mode test. Aucun appel au domaine de suivi, aucune carte bancaire, aucun paiement confirmé.":
    "En modo de prueba el proceso termina aquí. Ninguna llamada al dominio de seguimiento, ninguna tarjeta bancaria, ningún pago confirmado.",
  "Total TTC · livraison offerte": "Total IVA incluido · envío gratis",
  "En attente · non vérifié": "Pendiente · no verificado",
  "Offre prévue : {url} (non visitée)": "Oferta prevista: {url} (no visitada)",
  "Voir ma commande en attente": "Ver mi pedido pendiente",
  "Retour au panier": "Volver al carrito",
  "Ton panier est conservé. Reprendre le paiement réutilise cette commande et sa réservation.":
    "Tu carrito se conserva. Al retomar el pago se reutilizan este pedido y su reserva.",

  /* ---------- Checkout validation (src/lib/validation.ts, shown with tx) ---------- */
  "Prénom trop long.": "Nombre demasiado largo.",
  "Nom trop long.": "Apellidos demasiado largos.",
  "Adresse e-mail invalide.": "Correo electrónico no válido.",
  "Numéro de téléphone invalide.":"Número de teléfono no válido.",
  "Numéro de téléphone invalide pour le pays choisi.": "Número de teléfono no válido para el país elegido.",
  "Choisis un pays pour le téléphone.": "Elige un país para el teléfono.",
  "Adresse trop courte.": "Dirección demasiado corta.",
  "Code postal invalide.": "Código postal no válido.",
  "Code postal français à 5 chiffres.": "Código postal francés de 5 cifras.",
  "Code postal espagnol à 5 chiffres.": "Código postal español de 5 cifras.",
  "Indique ta ville.": "Indica tu ciudad.",
  "Choisis un pays.": "Elige un país.",
  "1000 caractères maximum.": "1000 caracteres como máximo.",
  "Indique ton prénom.": "Indica tu nombre.",
  "Indique ton nom.": "Indica tus apellidos.",
  "Indique ton prénom et ton nom.": "Indica tu nombre y tus apellidos.",
  "Choisis une taille.": "Elige una talla.",
  "Identifiant invalide.": "Identificador no válido.",
  "Clé de requête invalide.": "Clave de solicitud no válida.",
  "Identifiant de clic invalide.": "Identificador de clic no válido.",
  // Zod's French defaults (z.locales.fr) for an empty required field and a too-long text.
  "Entrée invalide : chaîne de caractères attendu, indéfini reçu": "Este campo es obligatorio.",
  "Trop grand : chaîne de caractères doit avoir <={max} caractères": "Demasiado largo: {max} caracteres como máximo.",

  /* ---------- Cart pricing (src/lib/pricing.ts) ---------- */
  "Quantité invalide.": "Cantidad no válida.",
  "L'offre pack n'est plus disponible.": "La oferta pack ya no está disponible.",
  "Le pack doit contenir {n} vestes.": "El pack debe contener {n} chaquetas.",
  "Cet article n'est plus disponible.": "Este artículo ya no está disponible.",
  "{name} : taille {size} indisponible.": "{name}: talla {size} no disponible.",
  "{name} n'est pas éligible au pack.": "{name} no se puede incluir en el pack.",

  /* ---------- Order and payment API errors (shown with tx) ---------- */
  // Shared by every storefront API (src/lib/http.ts).
  "Origine refusée.": "Origen no permitido.",
  "Requête invalide.": "Solicitud no válida.",
  "Certains champs sont invalides.": "Algunos campos no son válidos.",
  "Trop de tentatives. Réessaie dans quelques minutes.": "Demasiados intentos. Vuelve a intentarlo dentro de unos minutos.",
  "Réessaie dans quelques minutes.": "Vuelve a intentarlo dentro de unos minutos.",
  "Le paiement est momentanément indisponible. Réessaie plus tard.": "El pago no está disponible en este momento. Vuelve a intentarlo más tarde.",
  "Une photo produit approuvée est nécessaire pour le paiement externe.": "Se necesita una foto de producto aprobada para el pago externo.",
  "La réponse n’a pas pu être confirmée. Réessaie avec la même demande pour retrouver ta commande sans la dupliquer.":
    "No hemos podido confirmar la respuesta. Vuelve a intentarlo con la misma solicitud para recuperar tu pedido sin duplicarlo.",
  "Le paiement externe est désactivé. Contacte la boutique pour cette commande.": "El pago externo está desactivado. Contacta con la tienda para este pedido.",
  "Commande introuvable.": "Pedido no encontrado.",
  "Connexion interrompue. Réessaie : la même commande sera conservée.": "Conexión interrumpida. Vuelve a intentarlo: se conservará el mismo pedido.",
  "Cette boutique accepte uniquement les prix en EUR.": "Esta tienda solo acepta precios en EUR.",
  "Stock insuffisant pour la taille {size}.": "No hay stock suficiente de la talla {size}.",
  "Cette demande a déjà été enregistrée avec d’autres coordonnées. Retrouve la commande en attente ou utilise un nouveau panier.":
    "Esta solicitud ya se registró con otros datos. Recupera el pedido pendiente o usa un carrito nuevo.",
  "La préparation a été interrompue. Réessaie avec la même demande.": "La preparación se ha interrumpido. Vuelve a intentarlo con la misma solicitud.",
  "La commande est en préparation. Réessaie dans quelques instants avec la même demande.":
    "El pedido se está preparando. Vuelve a intentarlo en unos instantes con la misma solicitud.",
  "Panier invalide.": "Carrito no válido.",

  /* Hosted payment (src/lib/payments/everflow.ts, hosted.ts) */
  "Ce paiement accepte une seule veste à 19,99 € ou un seul pack de 2 à 24,95 €, livraison offerte. Modifie ton panier pour continuer.":
    "Este pago acepta una sola chaqueta a 19,99 € o un solo pack de 2 a 24,95 €, con envío gratis. Cambia tu carrito para continuar.",
  "Ce partenaire ne prend pas encore en charge le pays de livraison choisi.": "Este proveedor de pagos aún no admite el país de envío elegido.",
  "Indique séparément ton prénom et ton nom pour le paiement.": "Indica por separado tu nombre y tus apellidos para el pago.",
  "Destination de paiement refusée.": "Destino de pago rechazado.",
  "Produit de paiement invalide.": "Producto de pago no válido.",
  "Identifiant de clic Meta invalide.": "Identificador de clic de Meta no válido.",
  "Identifiant de clic Snapchat invalide.": "Identificador de clic de Snapchat no válido.",
  "Paiement externe indisponible.": "Pago externo no disponible.",
  "La redirection de paiement est désactivée par la boutique.": "La tienda ha desactivado la redirección de pago.",
  "Cette commande ne peut pas être relancée. Vérifie son statut ou contacte la boutique avant un autre paiement.":
    "Este pedido no se puede retomar. Comprueba su estado o contacta con la tienda antes de hacer otro pago.",
  "La configuration de cette tentative a changé. Contacte la boutique pour la rapprocher avant de réessayer.":
    "La configuración de este intento ha cambiado. Contacta con la tienda para que lo revise antes de volver a intentarlo.",
  // Configuration problems, shown on the checkout page while payment is unavailable.
  "Lien de paiement indisponible : la boutique doit vérifier sa configuration Everflow.": "Enlace de pago no disponible: la tienda debe revisar su configuración de Everflow.",
  "Identifiant de suivi incomplet ou invalide.": "Identificador de seguimiento incompleto o no válido.",
  "Configure uniquement les identifiants Pixel Meta et Snapchat valides pour le suivi Everflow combiné.":
    "Configura solo identificadores de píxel de Meta y Snapchat válidos para el seguimiento combinado de Everflow.",
  "Configure une seule plateforme publicitaire Everflow, ou désactive tous ses identifiants.":
    "Configura una sola plataforma publicitaria de Everflow o desactiva todos sus identificadores.",
  "Identifiant Pixel Meta invalide.": "Identificador de píxel de Meta no válido.",
  "Identifiant Pixel Snapchat invalide.": "Identificador de píxel de Snapchat no válido.",
  "Image publique de paiement non configurée.": "Imagen pública de pago no configurada.",
  "Une photo approuvée sur le domaine public HTTPS configuré est nécessaire.": "Se necesita una foto aprobada en el dominio público HTTPS configurado.",
  "Paiement indisponible : configure PAYMENT_PROVIDER=everflow ou désactive explicitement EVERFLOW_ENABLED.":
    "Pago no disponible: configura PAYMENT_PROVIDER=everflow o desactiva explícitamente EVERFLOW_ENABLED.",
  "Choisis explicitement le mode de paiement mock ou live.": "Elige explícitamente el modo de pago mock o live.",
  "Le simulateur nécessite une base locale isolée rio_everflow_test_* et APP_ENV=development.":
    "El simulador necesita una base local aislada rio_everflow_test_* y APP_ENV=development.",
  "Le paiement externe attend la validation du partenaire et l’approbation de la boutique. Aucun paiement n’a été lancé.":
    "El pago externo está pendiente de la validación del proveedor de pagos y de la aprobación de la tienda. No se ha iniciado ningún pago.",
  "Le suivi publicitaire attend la validation du consentement et du partenaire.":
    "El seguimiento publicitario está pendiente de la validación del consentimiento y del proveedor de pagos.",
  "Configuration du click ID ambiguë ou non approuvée.": "Configuración del click ID ambigua o no aprobada.",
  "Pays de paiement non configurés.": "Países de pago no configurados.",
  "Les variantes et l’image du pack doivent être validées avec le partenaire avant activation.":
    "Las variantes y la imagen del pack deben validarse con el proveedor de pagos antes de activarlas.",
};

export default es;
