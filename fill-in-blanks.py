import re

def fill_in_blanks(input) :
    matches = []
    pattern = input.lower().replace(" ", ".")
    lenPattern = len(pattern)
    regex = re.compile("^"+pattern+"$")
    with open(f"words_{lenPattern}.txt") as file :
        for line in file :
            word = line.rstrip()
            if regex.match(word) :
                matches.append(word)
    return matches

def lambda_handler(event, context) :
    return fill_in_blanks(event['pattern'])

