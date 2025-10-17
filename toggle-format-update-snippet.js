/*
=============================================================================
UPDATE toggleFormatCheckbox FUNCTION
=============================================================================
INSTRUCTIONS: Find the toggleFormatCheckbox function (around line 32303)

FIND THIS CODE (at the end of the function):
    // Show/hide skins value input
    const skinsSection = document.getElementById('skinsValueSection');
    if (skinsSection) {
        if (selectedFormats.includes('skins')) {
            skinsSection.style.display = 'block';
        } else {
            skinsSection.style.display = 'none';
        }
    }
};

ADD THIS CODE BEFORE THE CLOSING };
=============================================================================
*/

    // Show/hide scramble configuration
    const scrambleSection = document.getElementById('scrambleConfigSection');
    if (scrambleSection) {
        if (selectedFormats.includes('scramble')) {
            scrambleSection.style.display = 'block';
        } else {
            scrambleSection.style.display = 'none';
        }
    }
