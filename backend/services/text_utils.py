import re

def remove_accents(input_str: str) -> str:
    if not input_str:
        return ""
    s1 = u'ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹ'
    s0 = u'AAAAEEEIIOOOOUUYaaaaeeeiioooouuyAaDdIiUuOoUuAaAaAaAaAaAaAaAaAaAaAaAaAaEeEeEeEeEeEeEeEeEeIiIiOoOoOoOoOoOoOoOoOoOoOoOoUuUuUuUuUuUuUuYyYyYyYy'
    s = ''
    for c in input_str:
        if c in s1:
            s += s0[s1.index(c)]
        else:
            s += c
    return s

def matches_phrase(text: str, phrases: list[str]) -> bool:
    """
    Check if any of the given phrases exactly match as whole words in the text.
    Checks both the original text and the accent-removed text.
    """
    if not text or not phrases:
        return False
        
    text_clean = text.lower().strip()
    text_clean_alpha = re.sub(r'[^\w\s]', ' ', text_clean)
    text_no_accents = remove_accents(text_clean_alpha)
    
    for phrase in phrases:
        p_clean = phrase.lower().strip()
        p_alpha = re.sub(r'[^\w\s]', ' ', p_clean)
        
        # Word boundaries matching original (accented)
        pattern = r'(?<!\w)' + re.escape(p_alpha) + r'(?!\w)'
        if re.search(pattern, text_clean_alpha):
            return True
            
        # Word boundaries matching unaccented
        p_no_accents = remove_accents(p_alpha)
        pattern_no_accents = r'(?<!\w)' + re.escape(p_no_accents) + r'(?!\w)'
        if re.search(pattern_no_accents, text_no_accents):
            return True
            
    return False
