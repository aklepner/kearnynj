<?php
mysql_connect("localhost","kearnynj_admin","kalel");
$dbs = mysql_query("SHOW DATABASES");

while ($baris = mysql_fetch_array($dbs))
{
foreach ($baris as $node => $db) {
mysql_select_db($db);

// convert code
$res = mysql_query("SHOW TABLES");
while ($row = mysql_fetch_array($res))
{
    foreach ($row as $key => $table)
    {
        mysql_query("ALTER TABLE " . $table . " CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci");
        echo $key . " =&gt; " . $table . " CONVERTED<br />";
    }
}
}}
?>