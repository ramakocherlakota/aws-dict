import re
import json

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
    body = json.loads(event['body'])
    matches = fill_in_blanks(body['pattern'])
    return {
        "statusCode": 200,
        "headers": {
            "Content-type" : "application/json"
        },
        "body": json.dumps(matches),
        "isBase64Encoded": False
    };
