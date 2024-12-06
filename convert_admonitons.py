import re
import os

def convert_text_format(input_text):
    # Regular expression to match the :::note...::: block
    pattern = re.compile(r":::([a-zA-Z]+)\n(.*?)\n:::", re.DOTALL)

    # Function to replace matches with the new format
    def replace_block(match):
        admonition_type = match.group(1)
        content = match.group(2)
        return "!!! {}\n    {}".format(admonition_type, content.strip().replace('\n', '\n    '))

    # Replace all matching blocks
    output_text = pattern.sub(replace_block, input_text)
    return output_text

def convert_markdown_files_in_directory(directory):
    # Iterate over all files in the given directory
    files_updated = False
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                # Read the content of the markdown file
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                # Convert the content
                converted_content = convert_text_format(content)
                # Check if the content has changed
                if content != converted_content:
                    # Write the converted content back to the file
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(converted_content)
                    print(f"Updated file: {file_path}")
                    files_updated = True
    if not files_updated:
        print("No files were updated.")

# Example usage
directory = "docs"
convert_markdown_files_in_directory(directory)

