/**
 * Spanish for the text stored in the database (products, settings, FAQ,
 * pop-ups) and for the defaults in src/lib/defaults.ts and src/lib/marketing.ts.
 * Applied with tx(), so an exact entry wins and templates cover every colour.
 * When an admin rewrites one of these French texts, add its Spanish here.
 */
const es: Record<string, string> = {
  /* ---------- Products ---------- */
  "Veste Brésil {color}": "Chaqueta Brasil {color}",
  "Vestes Brésil": "Chaquetas Brasil",
  "Vert": "Verde",
  "Rose": "Rosa",
  "Noir": "Negro",
  "Blanc": "Blanco",
  "Bleu": "Azul",
  "Jaune": "Amarillo",
  "Coupe-vent léger aux couleurs du Brésil.": "Cortavientos ligero con los colores de Brasil.",
  "Coupe-vent léger aux couleurs du Brésil, coupe ample et fermeture zippée. La pièce qui habille une tenue sans l'alourdir.":
    "Cortavientos ligero con los colores de Brasil, corte amplio y cierre de cremallera. La prenda que completa un look sin recargarlo.",
  "Coupe-vent léger": "Cortavientos ligero",
  "Coupe ample": "Corte amplio",
  "Fermeture zippée intégrale": "Cremallera completa",
  "Capuche avec cordon de serrage": "Capucha con cordón ajustable",
  "Veste Brésil {color} — {price}": "Chaqueta Brasil {color} — {price}",
  "Veste Brésil {color} : coupe-vent léger, coupe ample, zip intégral. Du XS au 3XL. 2 vestes pour {price}.":
    "Chaqueta Brasil {color}: cortavientos ligero, corte amplio, cremallera completa. De la XS a la 3XL. 2 chaquetas por {price}.",
  "{name}, vue de face sur mannequin": "{name}, vista frontal en maniquí",
  "{name}, vue de dos sur mannequin": "{name}, vista trasera en maniquí",
  "{name}, vue de dos": "{name}, vista trasera",
  "{name}, vue de face": "{name}, vista frontal",
  "{name}, détail": "{name}, detalle",
  "Vestes": "Chaquetas",
  "Coupe-vent légers.": "Cortavientos ligeros.",

  /* ---------- Settings ---------- */
  "Vestes Brésil — coupe-vent léger, six coloris.": "Chaquetas Brasil: cortavientos ligero, seis colores.",
  "Livraison offerte et suivie · Retours sous {n} jours · 2 vestes pour {price}": "Envío gratis con seguimiento · Devolución en {n} días · 2 chaquetas por {price}",
  "Livraison offerte et suivie · Retour sous {n} jours · 2 vestes pour {price}": "Envío gratis con seguimiento · Devolución en {n} días · 2 chaquetas por {price}",
  "Deux couleurs. Un seul prix.": "Dos colores. Un solo precio.",
  "Mélange les coloris, choisis une taille pour chacune. L'économie s'applique automatiquement.":
    "Mezcla los colores y elige una talla para cada una. El ahorro se aplica automáticamente.",
  "Pack 2 vestes": "Pack 2 chaquetas",
  "Livraison gratuite et suivie, 2 à 4 jours ouvrés": "Envío gratis con seguimiento, de 2 a 4 días laborables",
  "La livraison est gratuite et suivie partout en France métropolitaine, en 2 à 4 jours ouvrés après confirmation de la commande. Un e-mail de suivi t'est envoyé à l'expédition.":
    "El envío es gratis y con seguimiento a toda la Francia metropolitana, en 2 a 4 días laborables tras la confirmación del pedido. Te enviamos un correo con el seguimiento cuando sale el paquete.",
  "Échange ou retour gratuit sous {n} jours": "Cambio o devolución gratis en {n} días",
  "Tu as 14 jours après réception pour échanger ou retourner ta veste, gratuitement. Elle doit être non portée, avec ses étiquettes. En cas de doute sur la taille, écris-nous avant de commander.":
    "Tienes 14 días desde la recepción para cambiar o devolver tu chaqueta, gratis. Debe estar sin usar y con sus etiquetas. Si dudas con la talla, escríbenos antes de pedir.",
  "Retour possible sous {n} jours après réception": "Devolución posible en {n} días desde la recepción",
  "Tu disposes de 15 jours après la réception de ta commande pour demander un retour. Contacte notre service client avec ton numéro de commande pour recevoir les instructions. En cas de doute sur la taille, écris-nous avant de commander.":
    "Tienes 15 días desde la recepción de tu pedido para solicitar una devolución. Contacta con atención al cliente con tu número de pedido para recibir las instrucciones. Si dudas con la talla, escríbenos antes de pedir.",
  "Les commandes en ligne ouvrent très bientôt. Laisse-nous un message pour être prévenu.":
    "Los pedidos en línea abren muy pronto. Déjanos un mensaje y te avisamos.",
  "Le paiement en ligne n'est pas encore disponible. Ta demande de commande est enregistrée sans paiement : nous te contactons par e-mail pour confirmer la commande et t'indiquer comment régler. Rien n'est débité aujourd'hui.":
    "El pago en línea aún no está disponible. Tu solicitud de pedido se registra sin pago: te escribimos por correo para confirmar el pedido y explicarte cómo pagar. Hoy no se cobra nada.",

  /* ---------- Admin FAQ (settings.faq) ---------- */
  "Quels sont les délais de livraison ?": "¿Cuáles son los plazos de entrega?",
  "La livraison est gratuite et suivie partout, en 2 à 4 jours ouvrés après la confirmation de ta commande.":
    "El envío es gratis y con seguimiento, en 2 a 4 días laborables tras la confirmación de tu pedido.",
  "Comment choisir ma taille ?": "¿Cómo elijo mi talla?",
  "Les vestes vont du XS au 3XL. Sur chaque fiche produit, le guide des tailles inclut un simulateur : indique ta taille et ton poids, il te donne une estimation. Entre deux tailles, prends la plus grande pour une coupe ample.":
    "Las chaquetas van de la XS a la 3XL. En cada ficha de producto, la guía de tallas incluye un simulador: indica tu altura y tu peso y te da una estimación. Si dudas entre dos tallas, elige la mayor para un corte amplio.",
  "Puis-je échanger ou retourner ma veste ?": "¿Puedo cambiar o devolver mi chaqueta?",
  "Oui, tu as 14 jours pour l'échanger ou la retourner, gratuitement. En cas de doute sur la taille, écris-nous avant de commander.":
    "Sí, tienes 14 días para cambiarla o devolverla, gratis. Si dudas con la talla, escríbenos antes de pedir.",
  "Oui, tu disposes de 15 jours après la réception de ta commande pour demander un retour. Contacte notre service client avec ton numéro de commande pour recevoir les instructions.":
    "Sí, tienes 15 días desde la recepción de tu pedido para solicitar una devolución. Contacta con atención al cliente con tu número de pedido para recibir las instrucciones.",
  "Comment se passe le paiement ?": "¿Cómo funciona el pago?",
  "Le paiement en ligne n'est pas encore ouvert. Tu envoies une demande de commande, nous la confirmons par e-mail et t'indiquons comment régler. Aucune donnée bancaire n'est demandée sur le site.":
    "El pago en línea aún no está abierto. Envías una solicitud de pedido, te la confirmamos por correo y te explicamos cómo pagar. En la web no se piden datos bancarios.",
  "Quels coloris sont disponibles ?": "¿Qué colores hay disponibles?",
  "Six coloris : vert, rose, noir, blanc, bleu et jaune. Chaque coloris a sa propre fiche, et tu peux composer un pack de 2 vestes avec les couleurs de ton choix.":
    "Seis colores: verde, rosa, negro, blanco, azul y amarillo. Cada color tiene su propia ficha, y puedes crear un pack de 2 chaquetas con los colores que quieras.",

  /* ---------- Pop-ups (defaults, Admin → Promotions) ---------- */
  "Bienvenue chez Rio District": "Te damos la bienvenida a Rio District",
  "Découvre notre collection de vestes Brésil, disponible en six coloris.": "Descubre nuestra colección de chaquetas Brasil, disponible en seis colores.",
  "Découvrir la collection": "Descubrir la colección",
  "Avant de partir": "Antes de irte",
  "Découvre nos vestes et compose ton pack de deux coloris au choix.": "Descubre nuestras chaquetas y crea tu pack de dos colores a elegir.",
  "Composer mon pack": "Crear mi pack",
  "Ton panier t'attend": "Tu carrito te espera",
  "Retrouve les articles que tu as sélectionnés.": "Recupera los artículos que has seleccionado.",
};

export default es;
