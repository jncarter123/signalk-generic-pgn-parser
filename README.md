# signalk-generic-pgn-parser
Allows users to parse PGNs that are not directly supported by SignalK.

# Getting started
1.) Use the SignalK Appstore to install the signalk-generic-pgn-parser plugin.<br/>
2.) Browse to Server => Plugin => Generic PGN Parser and enable it.<br/>
3.) Restart SignalK<br/>

## Configuration - Basic
At the basic level each PGN is required to have the PGN and the path you want to map it. The path is a template that you can specify any data field value or device instance for use in the path. The field value you want to use in the template should be surrounded by {} brackets.<br/>

For example if I want to include the instance in the PGN 65005, then I could use a path of electrical.ac.utility.{Instance}.total

![Basic Configuration](https://user-images.githubusercontent.com/30420708/76558583-8b536c80-646b-11ea-8cad-eddc7d9dbfb1.png)

## Configuration - Advanced

## Configuration - Proprietary
