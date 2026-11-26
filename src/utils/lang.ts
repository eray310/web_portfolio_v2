/**
 * The page is Turkish (lang="tr"), so CSS `text-transform: uppercase` turns "i" into "İ". English terms must say they
 * are English, or "Motion Design" is shown as "MOTİON DESİGN". Use: <span lang={enLang(text)}>{text}</span>.
 */
const EN = /^(Motion Design(er)?|Art Direct(or|ion)|Video Editor|AI Artist)$/;
export const enLang = (text: string): "en" | undefined => (EN.test(text.trim()) ? "en" : undefined);
