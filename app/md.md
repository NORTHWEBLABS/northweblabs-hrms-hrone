# The Ultimate Markdown Guide
This document serves as a comprehensive reference for every standard and extended Markdown feature.

---

## 1. Headers
Headers are created using `#` followed by a space.

# Level 1 Heading
## Level 2 Heading
### Level 3 Heading
#### Level 4 Heading
##### Level 5 Heading
###### Level 6 Heading

---

## 2. Emphasis (Typography)

**Bold Text**: `**Bold**` or `__Bold__`
*Italic Text*: `*Italic*` or `_Italic_`
***Bold & Italic***: `***Bold & Italic***`
~~Strikethrough~~: `~~Strikethrough~~`

---

## 3. Lists

### Unordered Lists
* Item 1
* Item 2
    * Sub-item 2a
    * Sub-item 2b
- Alternative bullet
+ Alternative bullet

### Ordered Lists
1. First item
2. Second item
    1. Indented item
    2. Indented item
3. Third item

### Task Lists (GFL)
- [x] Completed task
- [ ] Incomplete task
- [ ] Another task

---

## 4. Links and Images

**Basic Link**: [Google](https://www.google.com)
**Link with Title**: [Google](https://www.google.com "Google's Homepage")
**Automatic Link**: <https://www.google.com>

**Image**:
![Markdown Logo](https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg)

---

## 5. Blockquotes

> This is a blockquote.
> 
> > This is a nested blockquote.
> 
> "Markdown is intended to be as easy-to-read and easy-to-write as is feasible." - John Gruber

---

## 6. Code

**Inline Code**: Use backticks like `this`.

**Code Blocks (with syntax highlighting)**:
```python
def hello_world():
    print("Hello, Markdown!")